import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../server/Mongo";
import Booking from "../../../models/Booking";
import { format } from "date-fns";

// PATCH - Update booking with payment confirmation
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    await connectDB();

    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required", success: false },
        { status: 400 }
      );
    }

    const {
      paymentStatus,
      bookingStatus,
      paymentMethod,
      upiTransactionId,
    } = body;

    // Find and update the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found", success: false },
        { status: 404 }
      );
    }

    // Update booking fields
    const updateData: any = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (bookingStatus) updateData.bookingStatus = bookingStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (upiTransactionId) updateData.upiTransactionId = upiTransactionId;

    // If payment is completed, set payment completion time
    if (paymentStatus === 'completed') {
      updateData.paymentCompletedAt = new Date();
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true }
    );

    // Send payment confirmation notifications
    try {
      if (paymentStatus === 'completed' && bookingStatus === 'confirmed') {
        const userNotificationData = {
          name: updatedBooking.customerName,
          phone: updatedBooking.customerPhone,
          email: updatedBooking.customerEmail,
          preferences: {
            sms: true,
            push: false,
            whatsapp: true,
          },
        };

        const bookingDetails = {
          bookingId: updatedBooking._id.toString(),
          sport: updatedBooking.sport,
          date: format(new Date(updatedBooking.date), 'dd MMM yyyy'),
          timeSlots: updatedBooking.timeSlots,
          totalAmount: updatedBooking.totalAmount,
          paymentMethod: paymentMethod,
          upiTransactionId: upiTransactionId,
        };

        // await NotificationService.sendPaymentConfirmation(userNotificationData, bookingDetails);
        console.log('Payment confirmation notification would be sent:', { userNotificationData, bookingDetails });
      }
    } catch (notificationError) {
      console.error('Failed to send payment confirmation notifications:', notificationError);
      // Don't fail the booking update if notifications fail
    }

    return NextResponse.json({
      message: "Booking updated successfully",
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json(
      { message: "Error updating booking", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET - Get specific booking details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required", success: false },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { message: "Error fetching booking", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
