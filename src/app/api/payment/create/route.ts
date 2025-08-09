import { NextRequest, NextResponse } from 'next/server';
// import Razorpay from 'razorpay';

// PAYMENT GATEWAYS - COMING SOON
// Currently supporting: WhatsApp Payment and GPay with manual verification
// Future: Razorpay, PhonePe integration

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'INR', customerInfo, bookingReference, paymentMethod } = body;

    // Validate required fields
    if (!amount || !customerInfo?.name || !customerInfo?.phone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle different payment methods
    switch (paymentMethod) {
      case 'whatsapp':
        return handleWhatsAppPayment(amount, customerInfo, bookingReference);
      
      case 'gpay':
        return handleGPayPayment(amount, customerInfo, bookingReference);
      
      // COMING SOON FEATURES
      case 'razorpay':
        return NextResponse.json(
          { 
            success: false, 
            message: 'Razorpay integration coming soon! Please use WhatsApp or GPay for now.',
            comingSoon: true
          },
          { status: 501 }
        );
      
      case 'phonepe':
        return NextResponse.json(
          { 
            success: false, 
            message: 'PhonePe integration coming soon! Please use WhatsApp or GPay for now.',
            comingSoon: true
          },
          { status: 501 }
        );
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid payment method. Please use WhatsApp or GPay.' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error processing payment:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process payment request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// WhatsApp Payment Handler
async function handleWhatsAppPayment(amount: number, customerInfo: any, bookingReference: string) {
  try {
    // Generate payment reference
    const paymentReference = `WA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // WhatsApp payment details
    const whatsappNumber = process.env.WHATSAPP_PAYMENT_NUMBER || '9787020525'; // Your business WhatsApp number
    const paymentMessage = `Hi! I want to make a payment of ₹${amount} for booking ${bookingReference}. Customer: ${customerInfo.name}, Phone: ${customerInfo.phone}. Payment Ref: ${paymentReference}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(paymentMessage)}`;

    return NextResponse.json({
      success: true,
      paymentMethod: 'whatsapp',
      paymentReference,
      amount,
      currency: 'INR',
      whatsappUrl,
      instructions: [
        'Click the WhatsApp link below to contact our payment team',
        'Share your payment details and booking reference',
        'Complete the payment via the instructions provided',
        'You will receive confirmation once payment is verified'
      ],
      customerInfo,
      bookingReference
    });

  } catch (error) {
    console.error('WhatsApp payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create WhatsApp payment' },
      { status: 500 }
    );
  }
}

// GPay Payment Handler
async function handleGPayPayment(amount: number, customerInfo: any, bookingReference: string) {
  try {
    // Generate payment reference
    const paymentReference = `GP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // GPay details (you'll need to replace with your actual GPay details)
    const gpayUpiId = process.env.GPAY_UPI_ID || 'smartsatheesh7-1@okhdfcbank'; // Your GPay UPI ID
    const merchantName = process.env.MERCHANT_NAME || 'Sathiyan Sports';
    
    // Generate UPI payment URL
    const upiUrl = `upi://pay?pa=${gpayUpiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${bookingReference} - ${customerInfo.name}`)}`;

    return NextResponse.json({
      success: true,
      paymentMethod: 'gpay',
      paymentReference,
      amount,
      currency: 'INR',
      upiUrl,
      upiId: gpayUpiId,
      merchantName,
      qrCodeData: upiUrl, // This can be used to generate QR code on frontend
      instructions: [
        'Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.)',
        'Or click the payment link to open your UPI app directly',
        'Complete the payment and note down the transaction ID',
        'Enter the transaction ID in the verification form below',
        'Your booking will be confirmed once payment is verified'
      ],
      customerInfo,
      bookingReference,
      showTransactionIdInput: true
    });

  } catch (error) {
    console.error('GPay payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create GPay payment' },
      { status: 500 }
    );
  }
}
