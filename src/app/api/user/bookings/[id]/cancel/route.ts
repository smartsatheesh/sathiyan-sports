import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";
import connectDB from "@/app/server/Mongo";
import Booking from "@/app/models/Booking";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const bookingId = params.id;

    await connectDB();

    // Find the booking and verify ownership
    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [
        { userId: session.user.id },
        { customerEmail: session.user.email },
        { customerPhone: session.user.mobile }
      ]
    });

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === 'cancelled') {
      return NextResponse.json(
        { message: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    if (booking.bookingStatus !== 'confirmed') {
      return NextResponse.json(
        { message: "Only confirmed bookings can be cancelled" },
        { status: 400 }
      );
    }

    // Check if booking is at least 24 hours in the future
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      return NextResponse.json(
        { message: "Bookings can only be cancelled at least 24 hours before the scheduled time" },
        { status: 400 }
      );
    }

    // Update booking status
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        bookingStatus: 'cancelled',
        cancellationReason: 'Cancelled by customer',
        updatedAt: new Date(),
      },
      { new: true }
    );

    // TODO: Implement refund logic based on cancellation policy
    // For now, we'll just mark as cancelled

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
