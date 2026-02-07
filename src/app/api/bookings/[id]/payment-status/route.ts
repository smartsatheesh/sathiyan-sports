import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from "@/app/server/mongodb";
import Booking from "../../../../models/Booking";
import unifiedWhatsAppService from "../../../../services/UnifiedWhatsAppService";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongoose();
    
    const bookingId = params.id;
    const booking = await (Booking.findById as any)(bookingId);
    
    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found", success: false },
        { status: 404 }
      );
    }

    // Check if payment has been confirmed through external webhook or manual update
    return NextResponse.json({
      success: true,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      upiTransactionId: booking.upiTransactionId,
      paymentMethod: booking.paymentMethod,
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { 
        message: "Error checking payment status", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}

// POST - Webhook endpoint for payment confirmation from UPI/Payment Gateway
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongoose();
    
    const bookingId = params.id;
    const body = await req.json();
    
    // Validate webhook (you should implement proper signature verification)
    const { transactionId, status, amount, paymentMethod } = body;
    
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      const updatedBooking = await (Booking.findByIdAndUpdate as any)(
        bookingId,
        {
          paymentStatus: 'completed',
          bookingStatus: 'confirmed',
          upiTransactionId: transactionId,
          paymentMethod: paymentMethod || 'upi',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (updatedBooking) {
        // Send WhatsApp notification for booking confirmation
        try {
          const bookingDetails = {
            bookingReference: updatedBooking.bookingReference,
            courtName: updatedBooking.sport === 'Shuttle Badminton' 
              ? `Court ${updatedBooking.court || 'TBD'}` 
              : updatedBooking.sport,
            date: new Date(updatedBooking.date).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            time: updatedBooking.timeSlots.join(', '),
            amount: updatedBooking.totalAmount,
            customerName: updatedBooking.customerName
          };

          console.log('📱 Sending WhatsApp booking confirmation:', {
            phone: updatedBooking.customerPhone,
            reference: updatedBooking.bookingReference
          });

          const whatsappSent = await unifiedWhatsAppService.sendBookingConfirmation(
            updatedBooking.customerPhone,
            bookingDetails
          );

          if (whatsappSent) {
            console.log('✅ WhatsApp booking confirmation sent successfully');
          } else {
            console.warn('⚠️ WhatsApp booking confirmation failed');
          }

          // Also send admin notification
          const adminNotificationDetails = {
            ...bookingDetails,
            customerPhone: updatedBooking.customerPhone
          };

          const adminNotificationSent = await unifiedWhatsAppService.sendAdminNotification(
            adminNotificationDetails
          );

          if (adminNotificationSent) {
            console.log('✅ Admin WhatsApp notification sent successfully');
          } else {
            console.warn('⚠️ Admin WhatsApp notification failed');
          }

        } catch (whatsappError) {
          console.error('❌ WhatsApp notification error:', whatsappError);
          // Don't fail the payment confirmation if WhatsApp fails
        }

        return NextResponse.json({
          success: true,
          message: "Payment confirmed via webhook",
          booking: updatedBooking
        });
      }
    }
    
    return NextResponse.json({
      success: false,
      message: "Payment not confirmed"
    });

  } catch (error) {
    console.error("Payment webhook error:", error);
    return NextResponse.json(
      { 
        message: "Error processing payment webhook", 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      },
      { status: 500 }
    );
  }
}
