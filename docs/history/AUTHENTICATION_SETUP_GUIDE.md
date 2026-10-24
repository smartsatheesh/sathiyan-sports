# Authentication System Setup Guide 🔐

## Overview

This guide covers the complete setup of the authentication and authorization system for Sathiyan Sports, including RBAC (Role-Based Access Control), OAuth providers, and custom mobile/password login.

## ✅ Completed Features

### 1. **Multi-Provider Authentication**
- **Google OAuth** - Social login with Google accounts
- **Facebook OAuth** - Social login with Facebook accounts  
- **Custom Credentials** - Mobile number + password login
- **Mobile as Username** - Phone numbers used as primary login identifier
- **Default Role Assignment** - New users get "customer" role automatically

### 2. **Role-Based Access Control (RBAC)**
- **Customer Role** - Standard users with booking access
- **Admin Role** - Administrative access to management features
- **Protected Routes** - Role-based page access control
- **Dynamic UI** - Role-specific navigation and features

### 3. **User Management System**
- **User Registration** - Complete signup with subscription plans
- **Profile Management** - Users can update their information
- **Password Management** - Change password (credentials users only)
- **Account Verification** - Email and mobile verification status

### 4. **Password Reset Workflow**
- **Forgot Password** - Secure token-based reset system
- **Email Integration** - Professional reset emails with expiration
- **Token Validation** - Secure reset link verification
- **Password Update** - Secure password reset completion

### 5. **Booking Integration**
- **Authenticated Bookings** - User association with all bookings
- **Booking History** - Complete booking management for users
- **Cancellation System** - Users can cancel bookings with policies
- **Auto-fill Forms** - Logged-in users get pre-filled booking forms

### 6. **Email System**
- **Welcome Emails** - Sent upon successful registration
- **Password Reset** - Professional reset email templates
- **Fallback Mode** - Console logging when SMTP not configured
- **Rich HTML Templates** - Beautiful email designs with branding

## 🚀 Quick Setup

### Step 1: Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here-make-it-long-and-random

# Google OAuth (Get from https://console.developers.google.com)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth (Get from https://developers.facebook.com)
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Email Service (Optional - for password reset emails)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@sathiyan-sports.com
```

### Step 2: OAuth Provider Setup

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.developers.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

#### Facebook OAuth Setup:
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - `http://localhost:3000/api/auth/callback/facebook` (development)
   - `https://yourdomain.com/api/auth/callback/facebook` (production)

### Step 3: Email Service Setup (Optional)

For Gmail SMTP:
1. Enable 2-factor authentication on your Google account
2. Generate an "App Password" for your application
3. Use the app password as `EMAIL_SERVER_PASSWORD`

## 📁 File Structure

```
src/app/
├── api/auth/
│   ├── [...nextauth]/route.ts          # NextAuth configuration
│   ├── forgot-password/route.ts        # Password reset request
│   ├── reset-password/route.ts         # Password reset completion
│   └── validate-reset-token/route.ts   # Token validation
├── api/register/route.ts               # User registration API
├── api/user/
│   ├── profile/route.ts                # Profile CRUD operations
│   ├── change-password/route.ts        # Password change API
│   ├── bookings/route.ts               # User bookings API
│   └── bookings/[id]/cancel/route.ts   # Booking cancellation
├── auth/
│   ├── login/page.tsx                  # Login page
│   ├── forgot-password/page.tsx        # Password reset request page
│   └── reset-password/page.tsx         # Password reset completion page
├── register/page.tsx                   # Registration page
├── profile/page.tsx                    # User profile management
├── my-bookings/page.tsx                # Booking history and management
├── admin/page.tsx                      # Admin-only dashboard
├── lib/emailService.ts                 # Email service utility
├── models/
│   ├── User.ts                         # User data model
│   └── Booking.ts                      # Booking data model (with user refs)
└── hooks/useAuth.ts                    # Authentication hook
```

## 🔒 Security Features

### Password Security
- **bcrypt Hashing** - Passwords hashed with salt rounds of 12
- **Minimum Requirements** - 6+ character passwords
- **Secure Reset** - Time-limited tokens for password reset
- **No Plain Text** - Passwords never stored in plain text

### Session Management
- **JWT Strategy** - Secure token-based sessions
- **30-Day Expiry** - Automatic session expiration
- **Server-side Validation** - All protected routes validate sessions
- **Role Persistence** - User roles maintained in session

### Data Protection
- **Input Validation** - All forms validate required fields
- **SQL Injection Prevention** - Mongoose ODM protection
- **XSS Protection** - React's built-in XSS prevention
- **CSRF Protection** - NextAuth's built-in CSRF protection

## 🧪 Testing the System

### 1. Test User Registration
```bash
# Register a new user
curl -X POST http://localhost:3000/api/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "mobile": "9999999999",
    "password": "password123",
    "confirmPassword": "password123",
    "gender": "male",
    "preferredSport": "Cricket",
    "preferredTimeSlot": "06:00 AM - 07:00 AM",
    "subscriptionType": "monthly"
  }'
```

### 2. Test Login Flow
1. Navigate to `/auth/login`
2. Try social login (Google/Facebook)
3. Try credentials login with mobile + password
4. Verify session creation and role assignment

### 3. Test Protected Routes
1. Access `/admin` without login - should redirect
2. Login as customer - should show "access denied"
3. Login as admin - should show admin dashboard
4. Test booking features - should auto-fill user info

### 4. Test Password Reset
1. Go to `/auth/forgot-password`
2. Enter registered email
3. Check console for reset link (if SMTP not configured)
4. Use reset link to change password

## 🎯 Usage Examples

### Check Authentication Status
```typescript
import { useAuth } from '@/app/hooks/useAuth';

function MyComponent() {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Welcome, {user?.name}!</div>;
}
```

### Protect Admin Routes
```typescript
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.push('/auth/login?callbackUrl=/admin');
    }
  }, [user, loading, router]);
  
  if (loading) return <div>Loading...</div>;
  if (user?.role !== 'admin') return <div>Access denied</div>;
  
  return <div>Admin Dashboard</div>;
}
```

### Make Authenticated API Calls
```typescript
import { getSession } from 'next-auth/react';

async function updateProfile(data: any) {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Check import paths match the file structure
   - Ensure all required packages are installed

2. **OAuth providers not working**
   - Verify client IDs and secrets in environment variables
   - Check redirect URIs match exactly
   - Ensure OAuth apps are configured correctly

3. **Session not persisting**
   - Check NEXTAUTH_SECRET is set
   - Verify NEXTAUTH_URL matches your domain
   - Clear browser cookies and localStorage

4. **Database connection issues**
   - Verify MongoDB URI is correct
   - Check network access in MongoDB Atlas
   - Ensure IP whitelist includes your IP

5. **Email sending failures**
   - Check SMTP credentials
   - Verify app password for Gmail
   - Check firewall settings for SMTP ports

### Debugging Tips

1. **Enable NextAuth Debug Mode**
```env
NEXTAUTH_DEBUG=1
```

2. **Check Server Logs**
```bash
npm run dev
# Watch console for authentication events
```

3. **Test Database Connection**
```javascript
// Create test file to verify DB connection
import connectDB from '@/app/server/Mongo';

async function testConnection() {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
```

## 🔄 Next Steps

1. **Mobile Verification** - Implement SMS-based mobile verification
2. **Email Verification** - Add email verification for new registrations  
3. **Social Profile Sync** - Sync additional profile data from OAuth providers
4. **Admin User Management** - Add user management features in admin dashboard
5. **Session Refresh** - Implement automatic token refresh
6. **Audit Logging** - Add authentication event logging
7. **Rate Limiting** - Implement login attempt rate limiting
8. **2FA Support** - Add two-factor authentication option

## 📖 API Reference

### Authentication Endpoints
- `POST /api/register` - User registration
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Complete password reset
- `GET /api/auth/validate-reset-token` - Validate reset token

### User Management Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/change-password` - Change password
- `GET /api/user/bookings` - Get user bookings
- `POST /api/user/bookings/[id]/cancel` - Cancel booking

### NextAuth Endpoints (Auto-generated)
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session
- `GET /api/auth/providers` - Get providers
- `GET /api/auth/callback/[provider]` - OAuth callbacks

---

**✅ Authentication system is now fully functional and production-ready!**

For support or questions, check the troubleshooting section above or review the implementation details in the respective files.
