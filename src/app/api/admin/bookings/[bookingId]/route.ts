import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from "../../../../models/Booking";

// DELETE - Delete a specific booking
export async function DELETE(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Check authentication and admin access
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    const { bookingId } = params;

    // Validate bookingId
    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required' }, { status: 400 });
    }

    // Find and delete the booking
    const deletedBooking = await (Booking.findByIdAndDelete as any)(bookingId);

    if (!deletedBooking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      booking: deletedBooking
    });

  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Error deleting booking", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}