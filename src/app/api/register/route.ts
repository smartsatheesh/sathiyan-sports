import { NextResponse } from "next/server";
import connectDB from "@/app/server/Mongo";
import User from "@/app/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "phone",
      "gender",
      "preferredSport",
      "preferredTimeSlot",
      "subscriptionType",
      "subscriptionAmount",
      "subscriptionEndDate",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    // Create new user
    const user = await User.create(body);

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          name: user.name,
          email: user.email,
          preferredSport: user.preferredSport,
          subscriptionType: user.subscriptionType,
          subscriptionAmount: user.subscriptionAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "Error during registration" },
      { status: 500 }
    );
  }
}
