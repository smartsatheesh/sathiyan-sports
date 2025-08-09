import NextAuth, { AuthOptions, User as NextAuthUser, Account, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/server/Mongo';
import User from '@/app/models/User';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

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
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    
    // Facebook OAuth Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    
    // Custom Credentials Provider (Mobile + Password)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        mobile: { label: 'Mobile Number', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.mobile || !credentials?.password) {
          throw new Error('Please enter mobile number and password');
        }

        try {
          await connectDB();
          
          // Find user by mobile number
          const user = await User.findOne({ mobile: credentials.mobile });
          
          if (!user) {
            throw new Error('No user found with this mobile number');
          }

          // Check if user has a password (for social login users)
          if (!user.password) {
            throw new Error('Please login using Google or Facebook');
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

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
          console.error('Auth error:', error);
          throw new Error(error.message || 'Authentication failed');
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }: { user: NextAuthUser; account: Account | null; profile?: Profile }) {
      try {
        await connectDB();
        
        if (account?.provider === 'google' || account?.provider === 'facebook') {
          // Check if user already exists
          let existingUser = await User.findOne({ email: user.email });
          
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
