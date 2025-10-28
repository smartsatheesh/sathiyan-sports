import NextAuth, { AuthOptions, User as NextAuthUser, Account, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Extend the default session and JWT types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      mobile?: string;
    }
  }
  
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    mobile?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    mobile?: string;
    userId?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    // Conditionally add Google OAuth Provider only if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET 
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })] 
      : []
    ),
    
    // Conditionally add Facebook OAuth Provider only if credentials are available
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET 
      ? [FacebookProvider({
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        })] 
      : []
    ),
    
    // Custom Credentials Provider (Mobile + Password + Optional ChampID)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        mobile: { label: 'Mobile Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        champId: { label: 'Champion ID (if multiple users)', type: 'text' }
      },
      async authorize(credentials) {
        console.log('🔐 Authorization attempt:', { 
          mobile: credentials?.mobile, 
          champId: credentials?.champId,
          hasPassword: !!credentials?.password 
        });
        
        if (!credentials?.mobile || !credentials?.password) {
          console.error('❌ Missing credentials');
          throw new Error('Please enter mobile number and password');
        }

        try {
          console.log('🔌 Connecting to database...');
          await connectToMongoose();
          
          console.log('🔍 Looking for users with mobile:', credentials.mobile);
          // Find all users with this mobile number
          const users = await (User.find as any)({ mobile: credentials.mobile });
          
          if (!users || users.length === 0) {
            console.error('❌ No users found with mobile:', credentials.mobile);
            throw new Error('No user found with this mobile number');
          }

          console.log(`✅ Found ${users.length} user(s) with this mobile number`);

          // If specific champId provided, find that user
          if (credentials.champId && credentials.champId.trim() !== '') {
            const selectedUser = users.find((u: any) => u.champId === credentials.champId);
            if (!selectedUser) {
              console.error('❌ No user found with champId:', credentials.champId);
              throw new Error('Invalid Champion ID for this mobile number');
            }
            
            console.log('✅ User selected by ChampID:', { id: selectedUser._id, name: selectedUser.name, champId: selectedUser.champId });
            
            // Check password for selected user
            if (!selectedUser.password) {
              console.error('❌ Selected user has no password (probably social login)');
              throw new Error('Please login using Google or Facebook');
            }

            const isPasswordValid = await bcrypt.compare(credentials.password, selectedUser.password);
            if (!isPasswordValid) {
              console.error('❌ Invalid password for selected user');
              throw new Error('Invalid password');
            }

            return {
              id: selectedUser._id.toString(),
              name: selectedUser.name,
              email: selectedUser.email,
              role: selectedUser.role || 'customer',
              mobile: selectedUser.mobile,
            };
          }

          // If multiple users found and no champId provided, return user selection info
          if (users.length > 1) {
            const userOptions = users.map((u: any) => ({
              champId: u.champId,
              name: u.name,
              hasPassword: !!u.password
            }));
            
            console.log('🔀 Multiple users found, requiring selection:', userOptions);
            throw new Error(`MULTIPLE_USERS:${JSON.stringify(userOptions)}`);
          }

          // Single user found - proceed with normal login
          const user = users[0];
          console.log('✅ Single user found:', { id: user._id, name: user.name, hasPassword: !!user.password });

          // Check if user has a password (for social login users)
          if (!user.password) {
            console.error('❌ User has no password (probably social login)');
            throw new Error('Please login using Google or Facebook');
          }

          console.log('🔒 Verifying password...');
          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            console.error('❌ Password verification failed');
            throw new Error('Invalid password');
          }

          console.log('✅ Authentication successful for user:', user.name);
          
          // Return user object
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role,
            image: user.image || null,
          };
        } catch (error: any) {
          console.error('💥 Auth error:', error.message);
          throw new Error(error.message || 'Authentication failed');
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }: { user: NextAuthUser; account: Account | null; profile?: Profile }) {
      try {
        await connectToMongoose();
        
        // Handle OAuth providers (Google/Facebook) only if they exist
        if (account?.provider === 'google' || account?.provider === 'facebook') {
          // Check if user already exists
          let existingUser = await (User.findOne as any)({ email: user.email });
          
          if (!existingUser) {
            // Create new user for social login
            existingUser = new User({
              name: user.name,
              email: user.email,
              mobile: '', // Will be empty, user can update later
              role: 'customer', // Default role
              provider: account.provider,
              providerId: account.providerAccountId,
              image: user.image,
              emailVerified: true, // Social logins are pre-verified
            });
            await existingUser.save();
          } else {
            // Update existing user with social login info if not set
            if (!existingUser.provider) {
              existingUser.provider = account.provider;
              existingUser.providerId = account.providerAccountId;
              existingUser.image = user.image;
              await existingUser.save();
            }
          }
          
          // Update user object with role
          user.role = existingUser.role;
          user.mobile = existingUser.mobile;
          user.id = existingUser._id.toString();
        }
        
        return true;
      } catch (error: any) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    
    async jwt({ token, user, account }: { token: JWT; user?: NextAuthUser; account?: Account | null }) {
      // Add role and mobile to JWT token
      if (user) {
        token.role = user.role;
        token.mobile = user.mobile;
        token.userId = user.id;
      }
      return token;
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add role and mobile to session
      if (token) {
        session.user.role = token.role;
        session.user.mobile = token.mobile;
        if (token.userId) {
          session.user.id = token.userId;
        }
      }
      return session;
    }
  },
  
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};
