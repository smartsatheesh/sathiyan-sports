import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import User from '@/app/models/User';
import otpService from '@/app/services/OTPService';

export async function POST(request: NextRequest) {
  try {
    const { mobile } = await request.json();

    // Validate mobile number
    if (!mobile) {
      return NextResponse.json(
        { success: false, message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const formattedMobile = mobile.replace(/[+\s-]/g, '');

    if (!/^[6-9]\d{9}$/.test(formattedMobile)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid Indian mobile number' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const user = await (User as any).findOne({ mobile: formattedMobile });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No account found with this mobile number' },
        { status: 404 }
      );
    }

    // Check if user has a password
    if (!user.password) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'This account uses social login. Please login with Google or Facebook.' 
        },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = otpService.generateOTP();
    console.log(`🔐 Generated OTP for ${formattedMobile}: ${otp}`);

    // Store OTP
    await otpService.storeOTP(formattedMobile, otp);
    console.log(`💾 OTP stored successfully for ${formattedMobile}`);

    // For development/testing - always log OTP to console
    console.log(`\n🎯 =================================`);
    console.log(`📱 OTP FOR MOBILE: ${formattedMobile}`);
    console.log(`🔐 OTP CODE: ${otp}`);
    console.log(`⏰ EXPIRES: 10 minutes`);
    console.log(`🎯 =================================\n`);

    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully. Check server console for the OTP code.',
      mobile: formattedMobile,
      expiresIn: 10, // minutes
      // For demo purposes, include OTP in response (remove in production!)
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Error in forgot password OTP:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
