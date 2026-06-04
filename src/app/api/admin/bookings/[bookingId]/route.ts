import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from "../../../../models/Booking";

const CRICKET_DEFAULT_SLOT = '12:00 AM - 01:00 AM';

const normalizePaymentStatus = (paymentStatus?: string) => {
  if (!paymentStatus) return paymentStatus;

  const normalized = paymentStatus.toLowerCase();
  if (normalized === 'completed' || normalized === 'confirmed') {
    return 'paid';
  }

  return normalized;
};

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

// PATCH - Update a specific booking
export async function PATCH(
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
    const updateData = await req.json();
    const normalizedUpdateData = { ...updateData };

    if (typeof normalizedUpdateData.paymentStatus === 'string') {
      normalizedUpdateData.paymentStatus = normalizePaymentStatus(normalizedUpdateData.paymentStatus);
    }

    if (typeof normalizedUpdateData.sport === 'string' && normalizedUpdateData.sport !== 'Shuttle Badminton') {
      normalizedUpdateData.court = undefined;
    }

    if (typeof normalizedUpdateData.court === 'string' && normalizedUpdateData.court.trim() === '') {
      normalizedUpdateData.court = undefined;
    }

    if (
      normalizedUpdateData.sport === 'Cricket' &&
      Array.isArray(normalizedUpdateData.timeSlots) &&
      normalizedUpdateData.timeSlots.length === 0
    ) {
      normalizedUpdateData.timeSlots = [CRICKET_DEFAULT_SLOT];
    }

    // Validate bookingId
    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required' }, { status: 400 });
    }

    // Find and update the booking
    const updatedBooking = await (Booking.findByIdAndUpdate as any)(
      bookingId,
      normalizedUpdateData,
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Error updating booking", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}