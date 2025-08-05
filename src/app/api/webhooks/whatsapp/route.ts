// WhatsApp Webhook Handler
import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/app/services/whatsappService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token && challenge) {
    const verificationResult = WhatsAppService.verifyWebhook(mode, token, challenge);
    
    if (verificationResult) {
      console.log('WhatsApp webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.log('WhatsApp webhook verification failed');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    const processedMessage = WhatsAppService.processIncomingMessage(body);
    
    if (processedMessage) {
      // Handle different types of incoming messages
      switch (processedMessage.type) {
        case 'transaction_id':
          console.log('Transaction ID received via WhatsApp:', processedMessage);
          // You can process this transaction ID for payment confirmation
          // Example: Update booking payment status
          await handleTransactionIdReceived(processedMessage);
          break;
          
        case 'button_click':
          console.log('Button clicked via WhatsApp:', processedMessage);
          await handleButtonClick(processedMessage);
          break;
          
        case 'status_update':
          console.log('Message status update:', processedMessage);
          break;
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleTransactionIdReceived(message: any) {
  try {
    // Here you would:
    // 1. Find the pending booking for this phone number
    // 2. Update the booking with the transaction ID
    // 3. Mark payment as completed
    // 4. Send confirmation message
    
    console.log('Processing transaction ID:', message.transactionId, 'from:', message.from);
    
    // Example response
    await WhatsAppService.sendTextMessage(
      message.from,
      `✅ Thank you! We received your transaction ID: ${message.transactionId}
      
Your payment is being verified. You'll receive a confirmation shortly.

- Sathiyan Sports 🏅`
    );
  } catch (error) {
    console.error('Error handling transaction ID:', error);
  }
}

async function handleButtonClick(message: any) {
  try {
    const { from, buttonId } = message;
    
    switch (buttonId) {
      case 'upi_payment':
        await WhatsAppService.sendTextMessage(
          from,
          `💳 *UPI Payment Details*

Pay using any UPI app:
🆔 *UPI ID:* smartsatheesh7-1@okhdfcbank
👤 *Name:* Smart Satheesh

After payment, send us your transaction ID.

Need help? Reply with "HELP"`
        );
        break;
        
      case 'payment_help':
        await WhatsAppService.sendTextMessage(
          from,
          `❓ *Payment Help*

*How to pay:*
1. Open any UPI app (GPay, PhonePe, Paytm)
2. Send money to: smartsatheesh7-1@okhdfcbank
3. Enter the exact amount shown in your booking
4. Add note: "Booking payment for [Sport]"
5. Complete payment
6. Send us the transaction ID

*Need more help?*
Call: +91-XXXXXXXXXX

- Sathiyan Sports Team 🏅`
        );
        break;
        
      case 'cancel_booking':
        await WhatsAppService.sendTextMessage(
          from,
          `❌ *Booking Cancellation*

To cancel your booking, please confirm by replying with:
"CANCEL [YOUR_BOOKING_ID]"

⚠️ Note: Cancellation may have charges based on our policy.

- Sathiyan Sports`
        );
        break;
    }
  } catch (error) {
    console.error('Error handling button click:', error);
  }
}
