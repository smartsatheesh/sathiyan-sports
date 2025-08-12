import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";
import connectDB from "@/app/server/Mongo";
import User from "@/app/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await (User.findById as any)(session.user.id).select(
      "-password -__v"
    );

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        provider: user.provider || 'credentials',
        emailVerified: user.emailVerified || false,
        mobileVerified: user.mobileVerified || false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, email, mobile } = await request.json();

    // Validation
    if (!name || !email || !mobile) {
      return NextResponse.json(
        { message: "Name, email, and mobile are required" },
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

    // Validate mobile format (10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
      return NextResponse.json(
        { message: "Mobile number must be 10 digits" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email or mobile already exists (excluding current user)
    const existingUser = await (User.findOne as any)({
      $and: [
        { _id: { $ne: session.user.id } },
        {
          $or: [
            { email: email },
            { mobile: mobile }
          ]
        }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { message: "Email already exists" },
          { status: 400 }
        );
      }
      if (existingUser.mobile === mobile) {
        return NextResponse.json(
          { message: "Mobile number already exists" },
          { status: 400 }
        );
      }
    }

    const updatedUser = await (User.findByIdAndUpdate as any)(
      session.user.id,
      {
        name,
        email,
        mobile,
        // Reset verification flags if email/mobile changed
        ...(existingUser?.email !== email && { emailVerified: false }),
        ...(existingUser?.mobile !== mobile && { mobileVerified: false }),
      },
      { new: true }
    ).select("-password -__v");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        role: updatedUser.role,
        provider: updatedUser.provider || 'credentials',
        emailVerified: updatedUser.emailVerified || false,
        mobileVerified: updatedUser.mobileVerified || false,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
