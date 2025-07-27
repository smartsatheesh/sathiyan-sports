import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectDB();

    const user = await User.create(body);

    return NextResponse.json({
      message: "User registered successfully",
      success: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error registering user", error },
      { status: 500 }
    );
  }
}
