import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PhonePe callback handler for payment status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response } = body;

    // Validate required environment variables
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    if (!saltKey || !saltIndex) {
      return NextResponse.json({
        success: false,
        message: 'PhonePe configuration missing'
      }, { status: 500 });
    }

    // Verify the callback signature
    const xVerify = request.headers.get('X-VERIFY');
    if (!xVerify) {
      return NextResponse.json({
        success: false,
        message: 'Missing verification header'
      }, { status: 400 });
    }

    // Decode the response
    const decodedResponse = Buffer.from(response, 'base64').toString('utf-8');
    const paymentData = JSON.parse(decodedResponse);

    // Verify checksum
    const checksumString = response + '/pg/v1/status' + saltKey;
    const expectedChecksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + saltIndex;

    if (xVerify !== expectedChecksum) {
      console.error('PhonePe callback checksum verification failed');
      return NextResponse.json({
        success: false,
        message: 'Invalid signature'
      }, { status: 400 });
    }

    // Process the payment status
    console.log('PhonePe Payment Callback:', paymentData);

    // Here you can update your database with the payment status
    // For now, we'll just acknowledge the callback
    
    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('PhonePe callback processing error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while processing callback'
    }, { status: 500 });
  }
}

// Handle GET requests for redirect callbacks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    console.log('PhonePe redirect callback:', { transactionId });

    if (transactionId) {
      // Redirect to payment success page with transaction ID
      return NextResponse.redirect(
        new URL(`/payment/success?txn=${transactionId}`, request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL('/payment/failed', request.url)
      );
    }

  } catch (error) {
    console.error('PhonePe redirect callback error:', error);
    return NextResponse.redirect(
      new URL('/payment/failed', request.url)
    );
  }
}
