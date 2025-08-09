import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance only if credentials are available
let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Payment gateway not configured. Please add Razorpay credentials to environment variables.' 
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingReference 
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      console.log('Payment signature verification failed');
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Fetch payment details from Razorpay
    const payment: any = await razorpay.payments.fetch(razorpay_payment_id);
    
    console.log('Payment verified successfully:', {
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      upi: payment.upi || null
    });

    // Return verified payment details
    return NextResponse.json({
      success: true,
      paymentVerified: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: (payment.amount || 0) / 100, // Convert back to rupees
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        upiTransactionId: payment.acquirer_data?.rrn || payment.id,
        createdAt: new Date((payment.created_at || 0) * 1000).toISOString(),
        // UPI specific details
        upi: payment.upi ? {
          vpa: payment.upi.vpa || null,
          flow: payment.upi.flow || null
        } : null,
        // Customer details
        email: payment.email || '',
        contact: payment.contact || '',
        // Additional details
        fee: payment.fee ? payment.fee / 100 : 0,
        tax: payment.tax ? payment.tax / 100 : 0,
        acquirer_data: payment.acquirer_data || {}
      }
    });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to verify payment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Payment verification failed'
      },
      { status: 500 }
    );
  }
}
