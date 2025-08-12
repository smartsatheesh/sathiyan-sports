import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/server/Mongo";
import User from "@/app/models/User";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: "Reset token is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await (User.findOne as any)({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }, // Check if token hasn't expired
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
