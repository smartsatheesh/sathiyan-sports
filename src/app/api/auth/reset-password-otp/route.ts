import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import User from '@/app/models/User';
import bcrypt from 'bcryptjs';
import whatsAppCloudService from '@/app/services/WhatsAppCloudService';

export async function POST(request: NextRequest) {
  try {
    const { resetToken, mobile, newPassword, confirmPassword } = await request.json();

    // Validate input
    if (!resetToken || !mobile || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const formattedMobile = mobile.replace(/[+\s-]/g, '');

    await connectDB();

    // Find user with valid reset token
    const user = await (User as any).findOne({
      mobile: formattedMobile,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await (User as any).findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      updatedAt: new Date()
    });

    // Send confirmation via WhatsApp
    try {
      const confirmationMessage = `Password reset successful for your Sathiyan Sports account at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
      await whatsAppCloudService.sendOTPText(formattedMobile, confirmationMessage);
    } catch (error) {
      console.error('Error sending WhatsApp confirmation:', error);
      // Don't fail the password reset if WhatsApp fails
    }

    console.log(`✅ Password reset successful for ${formattedMobile}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      mobile: formattedMobile
    });

  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
