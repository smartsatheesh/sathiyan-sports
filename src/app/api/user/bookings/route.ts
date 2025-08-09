import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";
import connectDB from "@/app/server/Mongo";
import Booking from "@/app/models/Booking";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find bookings for the current user
    // Assuming the Booking model has a userId field
    const bookings = await Booking.find({ 
      $or: [
        { userId: session.user.id },
        { customerEmail: session.user.email },
        { customerPhone: session.user.mobile }
      ]
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      bookings: bookings,
    });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
