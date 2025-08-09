import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin route protection
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'admin') {
        return NextResponse.redirect(new URL('/auth/login?error=AccessDenied', req.url));
      }
    }

    // Authentication required routes
    if (pathname.startsWith('/book-slot') || 
        pathname.startsWith('/my-bookings') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/s3/enrolled')) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Always allow public routes
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/auth/') ||
          pathname === '/' ||
          pathname.startsWith('/contact') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/s3') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon.ico')
        ) {
          return true;
        }

        // For protected routes, check if user is authenticated
        if (pathname.startsWith('/admin')) {
          return token?.role === 'admin';
        }

        // For user-specific routes, just check if authenticated
        if (
          pathname.startsWith('/book-slot') || 
          pathname.startsWith('/my-bookings') ||
          pathname.startsWith('/profile')
        ) {
          return !!token;
        }

        // Allow all other routes by default
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/book-slot/:path*',
    '/my-bookings/:path*',
    '/profile/:path*',
    '/s3/enrolled/:path*'
  ]
};
