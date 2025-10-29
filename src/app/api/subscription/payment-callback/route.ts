import { NextRequest, NextResponse } from 'next/server';
import Subscription from '../../../models/Subscription';
import { connectToMongoose } from '../../../server/mongodb';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const body = await request.json();
    const { response } = body;

    if (!response) {
      return NextResponse.json({ error: 'No response data provided' }, { status: 400 });
    }

    // Verify the callback signature
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    if (!saltKey || !saltIndex) {
      console.error('PhonePe configuration missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Decode the response
    const decodedResponse = Buffer.from(response, 'base64').toString();
    const responseData = JSON.parse(decodedResponse);

    // Extract transaction ID to find subscription
    const transactionId = responseData.data?.merchantTransactionId;
    if (!transactionId || !transactionId.startsWith('SUB_')) {
      return NextResponse.json({ error: 'Invalid transaction ID format' }, { status: 400 });
    }

    // Extract subscription ID from transaction ID
    const subscriptionId = transactionId.split('_')[1];
    
    const subscription = await (Subscription.findById as any)(subscriptionId);
    if (!subscription) {
      console.error('Subscription not found for transaction:', transactionId);
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Update subscription based on payment status
    if (responseData.success && responseData.data?.state === 'COMPLETED') {
      subscription.paymentStatus = 'Paid';
      subscription.lastPaymentDate = new Date();
      subscription.transactionId = transactionId;
      
      // Reset notification flags for next cycle
      subscription.notificationsSent = {
        twoDaysBefore: false,
        onDueDate: false,
        twoDaysAfter: false
      };

      await subscription.save();

      console.log('Subscription payment successful:', {
        subscriptionId: subscription._id,
        transactionId,
        amount: subscription.amount
      });

      // Here you could send a success notification via WhatsApp/SMS
      // await sendPaymentSuccessNotification(subscription);

    } else {
      // Payment failed or pending
      subscription.paymentStatus = responseData.data?.state === 'PENDING' ? 'Pending' : 'Pending';
      await subscription.save();

      console.log('Subscription payment failed/pending:', {
        subscriptionId: subscription._id,
        transactionId,
        state: responseData.data?.state
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Callback processed successfully' 
    });

  } catch (error) {
    console.error('Error processing subscription payment callback:', error);
    return NextResponse.json({ 
      error: 'Failed to process callback' 
    }, { status: 500 });
  }
}

// Handle GET requests (in case PhonePe sends GET callback)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Subscription payment callback endpoint' 
  });
}