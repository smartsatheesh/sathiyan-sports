import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import Booking from '@/app/models/Booking';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      sport,
      date,
      timeSlot,
      court,
      customerInfo,
      totalPrice,
      transactionId,
      paymentMethod,
      paymentReference
    } = body;

    // Validate court selection for Shuttle Badminton
    if (sport === "Shuttle Badminton" && !court) {
      return NextResponse.json(
        { success: false, message: 'Court selection is required for Shuttle Badminton' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!sport || !date || !timeSlot || !customerInfo || !totalPrice) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Generate booking reference
    const bookingReference = `BK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create booking with payment pending verification
    const bookingData = {
      bookingReference,
      sport,
      date: new Date(date),
      timeSlots: [timeSlot], // Convert single timeSlot to array format
      court: court || undefined, // Include court for Shuttle Badminton
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      totalAmount: totalPrice,
      paymentStatus: 'pending_verification', // Manual verification required
      paymentMethod: paymentMethod || 'manual',
      transactionId: transactionId || '',
      paymentReference: paymentReference || '',
      bookingStatus: 'pending', // Use proper enum value
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booking = await (Booking.create as any)(bookingData);

    // Send WhatsApp notifications
    await sendWhatsAppNotifications(booking);

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully! Payment verification in progress.',
      booking: {
        id: booking._id,
        bookingReference: booking.bookingReference,
        sport: booking.sport,
        date: booking.date,
        timeSlots: booking.timeSlots, // Use timeSlots (plural) from the model
        totalAmount: booking.totalAmount,
        bookingStatus: booking.bookingStatus, // Use bookingStatus from the model
        paymentStatus: booking.paymentStatus
      },
      nextSteps: [
        'Your booking has been created with pending payment verification',
        'Our team will verify your payment within 30 minutes during business hours',
        'You will receive a confirmation call/WhatsApp once verified',
        'Keep your transaction ID safe for reference'
      ]
    });

  } catch (error: any) {
    console.error('Booking creation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create booking',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

async function sendWhatsAppNotifications(booking: any) {
  try {
    const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
    
    if (adminNumber) {
      const adminMessage = `🏆 NEW BOOKING ALERT 🏆\n\n` +
        `📝 Booking Ref: ${booking.bookingReference}\n` +
        `🏃 Sport: ${booking.sport}\n` +
        `📅 Date: ${new Date(booking.date).toLocaleDateString('en-IN')}\n` +
        `⏰ Time: ${booking.timeSlots ? booking.timeSlots.join(', ') : 'N/A'}\n` +
        `👤 Customer: ${booking.customerName}\n` +
        `📞 Phone: ${booking.customerPhone}\n` +
        `💰 Amount: ₹${booking.totalAmount}\n` +
        `💳 Payment: ${booking.paymentMethod}\n` +
        `🆔 Transaction ID: ${booking.transactionId}\n` +
        `⏱️ Booked: ${new Date().toLocaleString('en-IN')}\n\n` +
        `🔔 ACTION REQUIRED:\n` +
        `1. Verify the payment transaction\n` +
        `2. Confirm the slot availability\n` +
        `3. Update booking status\n` +
        `4. Contact customer for confirmation\n\n` +
        `🎯 Please verify and confirm this booking ASAP!`;

      // You could integrate with WhatsApp Business API here
      console.log('Admin notification sent for booking:', booking.bookingReference);
      console.log('Message:', adminMessage);
    }

    // Customer notification
    const customerMessage = `✅ BOOKING CONFIRMATION\n\n` +
      `Hello ${booking.customerName}!\n\n` +
      `Your booking has been received:\n` +
      `📝 Ref: ${booking.bookingReference}\n` +
      `🏃 Sport: ${booking.sport}\n` +
      `📅 Date: ${new Date(booking.date).toLocaleDateString('en-IN')}\n` +
      `⏰ Time: ${booking.timeSlots ? booking.timeSlots.join(', ') : 'N/A'}\n` +
      `💰 Amount: ₹${booking.totalAmount}\n\n` +
      `⏳ Status: Payment Verification in Progress\n\n` +
      `We will verify your payment and confirm your booking within 30 minutes during business hours.\n\n` +
      `Thank you for choosing Sathiyan Sports! 🏆`;

    console.log('Customer notification prepared for:', booking.customerPhone);
    console.log('Message:', customerMessage);

  } catch (error) {
    console.warn('Failed to send WhatsApp notifications:', error);
  }
}
