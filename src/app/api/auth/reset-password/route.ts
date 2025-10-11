import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password, resetToken, newPassword } = await request.json();
    
    // Support both parameter names for compatibility
    const finalToken = resetToken || token;
    const finalPassword = newPassword || password;

    if (!finalToken || !finalPassword) {
      return NextResponse.json(
        { success: false, message: "Token and password are required" },
        { status: 400 }
      );
    }

    if (finalPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Additional password strength validation
    const hasUpperCase = /[A-Z]/.test(finalPassword);
    const hasLowerCase = /[a-z]/.test(finalPassword);
    const hasNumbers = /\d/.test(finalPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
        },
        { status: 400 }
      );
    }

    await connectToMongoose();

    const user = await (User.findOne as any)({
      resetPasswordToken: finalToken,
      resetPasswordExpires: { $gt: new Date() }, // Check if token hasn't expired
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired reset token. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(finalPassword, saltRounds);

    // Update password and clear reset token fields
    await (User.findByIdAndUpdate as any)(user._id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      updatedAt: new Date()
    });

    console.log(`✅ Password reset successful for user: ${user.email || user.mobile}`);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
