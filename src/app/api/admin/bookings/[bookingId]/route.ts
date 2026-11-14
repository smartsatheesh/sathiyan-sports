import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from "../../../../models/Booking";
import { canManageBookings, canSeeMoney, isOwner } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';

const CRICKET_DEFAULT_SLOT = '12:00 AM - 01:00 AM';

// A coach changes slots, dates and booking status — never the money side
const MONEY_FIELDS = ['totalAmount', 'refundAmount', 'paymentStatus', 'paymentId', 'paymentMethod', 'transactionId', 'utr', 'paidAt'];

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
    // Deleting is the owner's job; coaches cancel instead
    const auth = await requireRole(isOwner);
    if (!auth.ok) return auth.response;

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
    const auth = await requireRole(canManageBookings);
    if (!auth.ok) return auth.response;

    // Connect to database
    await connectToMongoose();

    const { bookingId } = params;
    const updateData = await req.json();
    const normalizedUpdateData = { ...updateData };
    if (!canSeeMoney(auth.role)) {
      for (const field of MONEY_FIELDS) delete normalizedUpdateData[field];
    }

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