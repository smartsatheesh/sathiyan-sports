import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from '@/app/models/Booking';
import whatsAppCloudService from '@/app/services/WhatsAppCloudService';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    
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
    // Format date and time for display
    const bookingDate = new Date(booking.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeSlot = Array.isArray(booking.timeSlots) ? booking.timeSlots.join(', ') : booking.timeSlots || 'N/A';
    const courtName = booking.court || `${booking.sport} Court`;

    // Send customer booking confirmation
    const customerSuccess = await whatsAppCloudService.sendBookingConfirmation(
      booking.customerPhone,
      {
        bookingReference: booking.bookingReference,
        courtName,
        date: bookingDate,
        time: timeSlot,
        amount: booking.totalAmount,
        customerName: booking.customerName
      }
    );

    // Send admin notification
    const adminSuccess = await whatsAppCloudService.sendAdminNotification({
      bookingReference: booking.bookingReference,
      courtName,
      date: bookingDate,
      time: timeSlot,
      amount: booking.totalAmount,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone
    });

    console.log(`📱 WhatsApp notifications - Customer: ${customerSuccess ? '✅' : '❌'}, Admin: ${adminSuccess ? '✅' : '❌'}`);

  } catch (error) {
    console.warn('Failed to send WhatsApp notifications:', error);
    
    // Fallback to console logging for development/testing
    console.log('📱 BOOKING NOTIFICATION (Fallback)');
    console.log(`Customer: ${booking.customerName} (${booking.customerPhone})`);
    console.log(`Booking: ${booking.bookingReference}`);
    console.log(`Sport: ${booking.sport} | Amount: ₹${booking.totalAmount}`);
    console.log(`Date: ${booking.date} | Time: ${booking.timeSlots}`);
  }
}
