// SMS Webhook Handler (for Twilio delivery status)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const messageStatus = formData.get('MessageStatus');
    const messageSid = formData.get('MessageSid');
    const to = formData.get('To');
    const errorCode = formData.get('ErrorCode');
    const errorMessage = formData.get('ErrorMessage');

    console.log('SMS Status Webhook:', {
      messageStatus,
      messageSid,
      to,
      errorCode,
      errorMessage,
    });

    // Log SMS delivery status
    if (messageStatus === 'delivered') {
      console.log(`SMS ${messageSid} delivered to ${to}`);
    } else if (messageStatus === 'failed') {
      console.log(`SMS ${messageSid} failed to ${to}: ${errorMessage}`);
    } else if (messageStatus === 'undelivered') {
      console.log(`SMS ${messageSid} undelivered to ${to}: ${errorMessage}`);
    }

    // You can store this status in your database for tracking
    // await updateSMSStatus(messageSid, messageStatus, errorCode, errorMessage);

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
