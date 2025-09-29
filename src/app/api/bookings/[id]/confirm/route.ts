import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../../server/Mongo";
import Booking from "../../../../models/Booking";
import unifiedWhatsAppService from "../../../../services/UnifiedWhatsAppService";

/**
 * Manual booking confirmation endpoint
 * Used for admin confirmation or manual payment verification
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const bookingId = params.id;
    const body = await req.json();
    const { adminConfirmation = false, paymentMethod = 'manual', notes = '' } = body;

    // Find the booking
    const booking = await (Booking.findById as any)(bookingId);
    
    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found", success: false },
        { status: 404 }
      );
    }

    // Check if booking is already confirmed
    if (booking.bookingStatus === 'confirmed') {
      return NextResponse.json(
        { message: "Booking is already confirmed", success: false },
        { status: 400 }
      );
    }

    // Update booking status
    const updatedBooking = await (Booking.findByIdAndUpdate as any)(
      bookingId,
      {
        paymentStatus: 'completed',
        bookingStatus: 'confirmed',
        paymentMethod: paymentMethod,
        updatedAt: new Date(),
        ...(notes && { notes: notes })
      },
      { new: true }
    );

    if (!updatedBooking) {
      return NextResponse.json(
        { message: "Failed to update booking", success: false },
        { status: 500 }
      );
    }

    // Send WhatsApp notification for booking confirmation
    try {
      const bookingDetails = {
        bookingReference: updatedBooking.bookingReference,
        courtName: updatedBooking.sport === 'Shuttle Badminton' 
          ? `Court ${updatedBooking.court || 'TBD'}` 
          : updatedBooking.sport,
        date: new Date(updatedBooking.date).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: updatedBooking.timeSlots.join(', '),
        amount: updatedBooking.totalAmount,
        customerName: updatedBooking.customerName
      };

      console.log('📱 Sending WhatsApp booking confirmation (manual):', {
        phone: updatedBooking.customerPhone,
        reference: updatedBooking.bookingReference,
        adminConfirmation
      });

      // Send customer notification
      const whatsappSent = await unifiedWhatsAppService.sendBookingConfirmation(
        updatedBooking.customerPhone,
        bookingDetails
      );

      let notificationResults = {
        customerNotification: whatsappSent,
        adminNotification: false
      };

      // If this is an admin confirmation, also send admin notification
      if (adminConfirmation) {
        const adminNotificationDetails = {
          ...bookingDetails,
          customerPhone: updatedBooking.customerPhone
        };

        const adminNotificationSent = await unifiedWhatsAppService.sendAdminNotification(
          adminNotificationDetails
        );

        notificationResults.adminNotification = adminNotificationSent;
      }

      return NextResponse.json({
        success: true,
        message: "Booking confirmed successfully",
        booking: updatedBooking,
        notifications: notificationResults
      });

    } catch (whatsappError) {
      console.error('❌ WhatsApp notification error during manual confirmation:', whatsappError);
      
      // Return success for booking confirmation even if WhatsApp fails
      return NextResponse.json({
        success: true,
        message: "Booking confirmed successfully (WhatsApp notification failed)",
        booking: updatedBooking,
        notifications: {
          customerNotification: false,
          adminNotification: false,
          error: whatsappError instanceof Error ? whatsappError.message : "Unknown error"
        }
      });
    }

  } catch (error) {
    console.error("Manual booking confirmation error:", error);
    return NextResponse.json(
      { 
        message: "Error confirming booking", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if booking can be manually confirmed
 */
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

    const canConfirm = booking.bookingStatus !== 'confirmed' && booking.bookingStatus !== 'cancelled';
    
    return NextResponse.json({
      success: true,
      canConfirm,
      currentStatus: {
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        bookingReference: booking.bookingReference,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        sport: booking.sport,
        date: booking.date,
        timeSlots: booking.timeSlots,
        totalAmount: booking.totalAmount
      }
    });

  } catch (error) {
    console.error("Booking confirmation check error:", error);
    return NextResponse.json(
      { 
        message: "Error checking booking", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}
