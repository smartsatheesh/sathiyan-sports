import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const { mobile } = await request.json();
    
    if (!mobile) {
      return NextResponse.json(
        { success: false, message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    // Clean the mobile number (remove spaces, dashes, etc.)
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    
    if (cleanMobile.length !== 10) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    // Find all users with this mobile number
    const users = await (User.find as any)({ 
      mobile: cleanMobile 
    }).select('champId name mobile champType email mode flexibleAttendance').lean();

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No account found with this mobile number. Please register first or check your mobile number.',
        users: []
      });
    }

    // Return users found
    return NextResponse.json({
      success: true,
      message: `Found ${users.length} account(s) with this mobile number`,
      users: users.map(user => ({
        champId: user.champId,
        name: user.name,
        mobile: user.mobile,
        champType: user.champType,
        email: user.email,
        flexibleAttendance: user.mode === 'flexible' || user.flexibleAttendance
      }))
    });

  } catch (error: any) {
    console.error('Mobile check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check mobile number',
        error: error.message 
      },
      { status: 500 }
    );
  }
}