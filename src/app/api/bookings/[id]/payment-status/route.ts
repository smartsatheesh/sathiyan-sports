import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../../server/Mongo";
import Booking from "../../../../models/Booking";

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
    await connectDB();
    
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
