import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'INR', customerInfo, bookingReference } = body;

    // Validate required fields
    if (!amount || !customerInfo?.name || !customerInfo?.phone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: bookingReference || `receipt_${Date.now()}`,
      notes: {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || '',
        booking_type: 'sports_booking',
        booking_reference: bookingReference
      },
      payment_capture: 1, // Auto capture payment
    };

    console.log('Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created successfully:', order.id);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      customerInfo: {
        name: customerInfo.name,
        email: customerInfo.email || '',
        contact: customerInfo.phone
      },
      theme: {
        color: '#1976d2' // Material-UI primary color
      },
      notes: order.notes
    });

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create payment order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
