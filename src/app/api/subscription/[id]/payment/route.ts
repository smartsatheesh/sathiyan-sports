import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/authConfig';
import Subscription from '../../../../models/Subscription';
import { connectToMongoose } from '../../../../server/mongodb'; 
import crypto from 'crypto';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethod, customerInfo } = body;

    const subscription = await (Subscription.findById as any)(params.id)
      .populate('userId', 'name email phone champId');

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check if user can pay for this subscription
    if (session.user.role !== 'admin' && subscription.userId._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if subscription is already paid
    if (subscription.paymentStatus === 'Paid') {
      return NextResponse.json({ error: 'Subscription is already paid' }, { status: 400 });
    }

    if (paymentMethod === 'PhonePe' || paymentMethod === 'GPay') {
      // Validate PhonePe configuration
      const merchantId = process.env.PHONEPE_MERCHANT_ID;
      const saltKey = process.env.PHONEPE_SALT_KEY;
      const saltIndex = process.env.PHONEPE_SALT_INDEX;

      if (!merchantId || !saltKey || !saltIndex) {
        return NextResponse.json({
          success: false,
          message: 'Payment gateway configuration missing.'
        }, { status: 500 });
      }

      // Generate unique transaction ID for subscription
      const transactionId = `SUB_${subscription._id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Amount should be in paise (multiply by 100)
      const amountInPaise = Math.round(subscription.amount * 100);

      // Create payment payload
      const paymentPayload = {
        merchantId: merchantId,
        merchantTransactionId: transactionId,
        merchantUserId: subscription.userId.champId || `USER_${subscription.userId._id}`,
        amount: amountInPaise,
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/payment-success?txn=${transactionId}&sub=${subscription._id}`,
        redirectMode: 'POST',
        callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/subscription/payment-callback`,
        mobileNumber: customerInfo?.phone || subscription.userId.phone,
        paymentInstrument: {
          type: 'PAY_PAGE'
        }
      };

      // Convert payload to base64
      const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

      // Create checksum
      const checksumString = base64Payload + '/pg/v1/pay' + saltKey;
      const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + saltIndex;

      // Determine API URL based on environment
      const environment = process.env.PHONEPE_ENVIRONMENT || 'UAT';
      const apiUrl = environment === 'PRODUCTION' 
        ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
        : 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/pay';

      // Make request to PhonePe
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum
        },
        body: JSON.stringify({
          request: base64Payload
        })
      });

      const result = await response.json();

      if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
        // Update subscription with payment method and transaction ID
        subscription.paymentMethod = paymentMethod;
        subscription.transactionId = transactionId;
        subscription.updatedBy = session.user.id;
        await subscription.save();

        return NextResponse.json({
          success: true,
          paymentUrl: result.data.instrumentResponse.redirectInfo.url,
          transactionId: transactionId,
          message: 'Payment URL generated successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: result.message || 'Failed to create payment'
        }, { status: 400 });
      }
    } else if (paymentMethod === 'WhatsApp') {
      // For WhatsApp payments, we'll mark as pending and send WhatsApp message
      const transactionId = `WHATSAPP_SUB_${subscription._id}_${Date.now()}`;
      
      subscription.paymentMethod = paymentMethod;
      subscription.transactionId = transactionId;
      subscription.updatedBy = session.user.id;
      await subscription.save();

      // Here you would integrate with WhatsApp API to send payment details
      // For now, we'll return the payment details
      
      const paymentMessage = `🏥 *Health Subscription Payment*

Hi ${subscription.userId.name}!

Your ${subscription.subscriptionType} Health Plan subscription is ready for payment.

💰 *Amount:* ₹${subscription.amount}
📅 *Valid Until:* ${subscription.endDate.toLocaleDateString()}
🆔 *Transaction ID:* ${transactionId}

*Payment Options:*
• GPay: ${process.env.GPAY_UPI_ID || 'your-gpay@upi'}
• PhonePe: ${process.env.PHONEPE_UPI_ID || 'your-phonepe@upi'}
• Bank Transfer: Account details in profile

After payment, please share the transaction screenshot for verification.

Thank you for choosing our health services! 🙏`;

      return NextResponse.json({
        success: true,
        transactionId: transactionId,
        whatsappMessage: paymentMessage,
        message: 'WhatsApp payment request created successfully'
      });
    } else {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}