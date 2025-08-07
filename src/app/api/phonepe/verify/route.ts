import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PhonePe payment verification endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, bookingReference } = body;

    // Validate required environment variables
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const environment = process.env.PHONEPE_ENVIRONMENT || 'UAT';

    if (!merchantId || !saltKey || !saltIndex) {
      return NextResponse.json({
        success: false,
        message: 'PhonePe configuration missing'
      }, { status: 500 });
    }

    if (!transactionId) {
      return NextResponse.json({
        success: false,
        message: 'Transaction ID is required'
      }, { status: 400 });
    }

    // Create checksum for status check
    const checksumString = `/pg/v1/status/${merchantId}/${transactionId}` + saltKey;
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + saltIndex;

    // PhonePe status check API endpoint
    const apiEndpoint = environment === 'PRODUCTION' 
      ? `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${transactionId}`
      : `https://api-preprod.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${transactionId}`;

    // Make request to PhonePe for status check
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId,
        'accept': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success && result.data) {
      const paymentData = result.data;
      
      // Check if payment is successful
      if (paymentData.state === 'COMPLETED' && paymentData.responseCode === 'SUCCESS') {
        return NextResponse.json({
          success: true,
          payment: {
            transactionId: paymentData.merchantTransactionId,
            phonepeTransactionId: paymentData.transactionId,
            amount: paymentData.amount / 100, // Convert from paise to rupees
            status: paymentData.state,
            paymentMethod: 'UPI',
            upiTransactionId: paymentData.transactionId,
            responseCode: paymentData.responseCode,
            paymentInstrument: paymentData.paymentInstrument
          },
          message: 'Payment verified successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `Payment ${paymentData.state.toLowerCase()}`,
          status: paymentData.state,
          responseCode: paymentData.responseCode
        }, { status: 400 });
      }
    } else {
      console.error('PhonePe status check error:', result);
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to verify payment status'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('PhonePe payment verification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while verifying payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle PhonePe callback (webhook)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    if (!transactionId) {
      return NextResponse.json({
        success: false,
        message: 'Transaction ID missing in callback'
      }, { status: 400 });
    }

    // Redirect to success page with transaction ID
    return NextResponse.redirect(
      new URL(`/payment/success?txn=${transactionId}`, request.url)
    );

  } catch (error) {
    console.error('PhonePe callback error:', error);
    return NextResponse.redirect(
      new URL('/payment/failed', request.url)
    );
  }
}
