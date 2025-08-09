import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/server/Mongo";
import User from "@/app/models/User";
import crypto from "crypto";
import emailService from "@/app/lib/emailService";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal if email exists or not
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Check if user registered with social login
    if (user.provider && user.provider !== 'credentials') {
      return NextResponse.json(
        { message: "This account uses social login. Password reset is not available." },
        { status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry,
    });

    // Save reset token to user
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry,
    });

    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      email, 
      user.name || 'User', 
      resetToken
    );

    if (!emailSent) {
      console.warn('Failed to send password reset email, but continuing...');
    }

    return NextResponse.json({
      success: true,
      message: "If the email exists, a reset link has been sent",
      // In development, include additional info
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken,
        note: "Check console for email content if SMTP is not configured." 
      }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
