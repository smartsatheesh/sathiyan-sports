import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import User from '@/app/models/User';

export async function GET() {
  try {
    await connectDB();
    
    // Get all users (for debugging - remove in production)
    const users = await User.find({}, { password: 0 }).limit(10); // Exclude passwords
    
    return NextResponse.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        provider: user.provider
      }))
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
