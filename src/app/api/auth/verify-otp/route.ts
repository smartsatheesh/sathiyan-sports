import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import User from '@/app/models/User';
import otpService from '@/app/services/OTPService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { mobile, otp } = await request.json();

    // Validate input
    if (!mobile || !otp) {
      return NextResponse.json(
        { success: false, message: 'Mobile number and OTP are required' },
        { status: 400 }
      );
    }

    // Format mobile number
    const formattedMobile = mobile.replace(/[+\s-]/g, '');

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: 'OTP must be 6 digits' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const user = await (User as any).findOne({ mobile: formattedMobile });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(formattedMobile, otp);

    if (!verificationResult.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: verificationResult.message,
          attemptsLeft: verificationResult.attemptsLeft 
        },
        { status: 400 }
      );
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset token
    await (User as any).findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpires,
      updatedAt: new Date()
    });

    console.log(`✅ OTP verified for ${formattedMobile}, reset token generated`);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      resetToken,
      expiresIn: 15, // minutes
      mobile: formattedMobile
    });

  } catch (error) {
    console.error('Error in OTP verification:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
