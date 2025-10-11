import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const body = await request.json();
    const { 
      transactionId, 
      paymentMethod, 
      paymentReference, 
      amount, 
      customerInfo, 
      bookingReference 
    } = body;

    // Validate required fields
    if (!transactionId || !paymentMethod || !amount || !customerInfo?.phone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields for transaction verification' },
        { status: 400 }
      );
    }

    // Store transaction for manual verification
    const verificationData = {
      transactionId,
      paymentMethod,
      paymentReference,
      amount,
      customerInfo,
      bookingReference,
      status: 'pending_verification',
      submittedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null
    };

    // Here you would typically store this in a database
    // For now, we'll just log it and return success
    console.log('Transaction submitted for verification:', verificationData);

    // Send WhatsApp notification to admin (if configured)
    if (process.env.WHATSAPP_ADMIN_NUMBER) {
      try {
        const adminMessage = `🔔 New Payment Verification Required\n\n` +
          `📱 Transaction ID: ${transactionId}\n` +
          `💰 Amount: ₹${amount}\n` +
          `👤 Customer: ${customerInfo.name}\n` +
          `📞 Phone: ${customerInfo.phone}\n` +
          `🎯 Booking: ${bookingReference}\n` +
          `💳 Method: ${paymentMethod.toUpperCase()}\n` +
          `⏰ Time: ${new Date().toLocaleString('en-IN')}\n\n` +
          `Please verify this payment and update the booking status.`;

        const adminWhatsAppUrl = `https://wa.me/${process.env.WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
        
        // You could integrate with WhatsApp Business API here
        console.log('Admin notification URL:', adminWhatsAppUrl);
      } catch (notificationError) {
        console.warn('Failed to send admin notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction submitted for verification successfully!',
      verificationId: paymentReference,
      status: 'pending_verification',
      instructions: [
        'Your transaction has been submitted for manual verification',
        'Our team will verify your payment within 30 minutes during business hours',
        'You will receive a confirmation call/WhatsApp once verified',
        'Your booking will be confirmed after payment verification',
        'For urgent queries, please contact our support team'
      ],
      estimatedVerificationTime: '30 minutes during business hours (9 AM - 8 PM)',
      supportContact: process.env.WHATSAPP_PAYMENT_NUMBER || '9876543210'
    });

  } catch (error: any) {
    console.error('Error verifying transaction:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to submit transaction for verification',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
