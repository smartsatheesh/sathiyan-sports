import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../server/Mongo";
import Booking from "../../../models/Booking";
// import { NotificationService } from "../../../services/notificationService";
import { format } from "date-fns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const bookingId = params.id;
    const body = await req.json();
    
    const {
      paymentStatus,
      bookingStatus,
      paymentMethod,
      upiTransactionId,
      paymentId,
      paymentReference,
      bankDetails,
      walletDetails,
      upiApp
    } = body;

    // Find the booking
    const booking = await (Booking.findById as any)(bookingId);
    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found", success: false },
        { status: 404 }
      );
    }

    // Update booking with payment information
    const updateData: any = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (bookingStatus) updateData.bookingStatus = bookingStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (upiTransactionId) updateData.upiTransactionId = upiTransactionId;
    if (paymentId) updateData.paymentId = paymentId;
    if (paymentReference) updateData.paymentReference = paymentReference;
    if (bankDetails) updateData.bankDetails = bankDetails;
    if (walletDetails) updateData.walletDetails = walletDetails;
    if (upiApp) updateData.upiApp = upiApp;
    
    updateData.updatedAt = new Date();

    const updatedBooking = await (Booking.findByIdAndUpdate as any)(
      bookingId,
      updateData,
      { new: true }
    );

    // Send notifications based on payment status change
    try {
      if (paymentStatus === 'completed' && booking.paymentStatus !== 'completed') {
        // Payment successful - send success notification (WhatsApp only)
        const userNotificationData = {
          name: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          preferences: {
            sms: false, // COMMENTED OUT: Twilio SMS disabled
            push: false, // COMMENTED OUT: Firebase push notifications disabled
            whatsapp: true, // Only WhatsApp remains active
          },
        };

        const bookingDetails = {
          bookingId: booking._id.toString(),
          sport: booking.sport,
          date: format(new Date(booking.date), 'dd MMM yyyy'),
          timeSlots: booking.timeSlots,
          totalAmount: booking.totalAmount,
        };

        // await NotificationService.sendPaymentSuccess(userNotificationData, bookingDetails);
        console.log('Payment success notification would be sent:', { userNotificationData, bookingDetails });
      } else if (paymentStatus === 'expired' && booking.paymentStatus !== 'expired') {
        // Payment expired - send cancellation notification (WhatsApp only)
        const userNotificationData = {
          name: booking.customerName,
          phone: booking.customerPhone,
          email: booking.customerEmail,
          preferences: {
            sms: false, // COMMENTED OUT: Twilio SMS disabled
            push: false, // COMMENTED OUT: Firebase push notifications disabled
            whatsapp: true, // Only WhatsApp remains active
          },
        };

        // await NotificationService.sendBookingCancellation(
        //   userNotificationData,
        //   booking._id.toString(),
        //   'Payment time expired'
        // );
        console.log('Booking cancellation notification would be sent:', {
          userNotificationData,
          bookingId: booking._id.toString(),
          reason: 'Payment time expired'
        });
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the update if notifications fail
    }

    return NextResponse.json({
      message: "Booking updated successfully",
      success: true,
      booking: updatedBooking,
    });

  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json(
      { 
        message: "Error updating booking", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}

// GET single booking
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const bookingId = params.id;
    const booking = await (Booking.findById as any)(bookingId);
    
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
    console.error("Booking fetch error:", error);
    return NextResponse.json(
      { 
        message: "Error fetching booking", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}
