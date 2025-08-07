import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PhonePe payment creation endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, customerInfo, bookingReference } = body;

    // Validate required environment variables
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const environment = process.env.PHONEPE_ENVIRONMENT || 'UAT';

    if (!merchantId || !saltKey || !saltIndex) {
      return NextResponse.json({
        success: false,
        message: 'PhonePe configuration missing. Please set PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, and PHONEPE_SALT_INDEX in environment variables.'
      }, { status: 500 });
    }

    // Generate unique transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Amount should be in paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);

    // Create payment payload
    const paymentPayload = {
      merchantId: merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: customerInfo.phone || 'USER_' + Date.now(),
      amount: amountInPaise,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success?txn=${transactionId}`,
      redirectMode: 'POST',
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/phonepe/callback`,
      mobileNumber: customerInfo.phone,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Convert payload to base64
    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    // Create checksum
    const checksumString = base64Payload + '/pg/v1/pay' + saltKey;
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + saltIndex;

    // PhonePe API endpoint
    const apiEndpoint = environment === 'PRODUCTION' 
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
      : 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/pay';

    // Make request to PhonePe
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'accept': 'application/json'
      },
      body: JSON.stringify({
        request: base64Payload
      })
    });

    const result = await response.json();

    if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
      return NextResponse.json({
        success: true,
        paymentUrl: result.data.instrumentResponse.redirectInfo.url,
        transactionId: transactionId,
        merchantId: merchantId,
        message: 'Payment URL generated successfully'
      });
    } else {
      console.error('PhonePe API Error:', result);
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to create payment URL',
        error: result
      }, { status: 400 });
    }

  } catch (error) {
    console.error('PhonePe payment creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while creating payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
