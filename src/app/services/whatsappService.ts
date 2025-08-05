// WhatsApp Business API Service
import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  content: any;
}

export interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode: string;
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time';
    text?: string;
    currency?: {
      fallback_value: string;
      code: string;
      amount_1000: number;
    };
    date_time?: {
      fallback_value: string;
    };
  }>;
}

export class WhatsAppService {
  private static async sendRequest(data: any) {
    try {
      if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
        console.error('WhatsApp API credentials not configured');
        return { success: false, error: 'WhatsApp API not configured' };
      }

      const response = await axios.post(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('WhatsApp message sent successfully:', response.data);
      return {
        success: true,
        messageId: response.data.messages[0].id,
        waId: response.data.contacts[0].wa_id,
      };
    } catch (error: any) {
      console.error('WhatsApp message failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Failed to send WhatsApp message',
      };
    }
  }

  // Send text message
  static async sendTextMessage(to: string, message: string) {
    // Format phone number (remove + and ensure country code)
    const formattedTo = to.replace(/\D/g, '').replace(/^91/, '91');

    const data = {
      messaging_product: 'whatsapp',
      to: formattedTo,
      type: 'text',
      text: {
        body: message,
      },
    };

    return this.sendRequest(data);
  }

  // Send template message
  static async sendTemplateMessage({
    to,
    templateName,
    languageCode,
    parameters = [],
  }: WhatsAppTemplateMessage) {
    const formattedTo = to.replace(/\D/g, '').replace(/^91/, '91');

    const data = {
      messaging_product: 'whatsapp',
      to: formattedTo,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: parameters.length > 0 ? [
          {
            type: 'body',
            parameters: parameters,
          },
        ] : [],
      },
    };

    return this.sendRequest(data);
  }

  // Send interactive button message
  static async sendInteractiveMessage(to: string, body: string, buttons: Array<{id: string, title: string}>) {
    const formattedTo = to.replace(/\D/g, '').replace(/^91/, '91');

    const data = {
      messaging_product: 'whatsapp',
      to: formattedTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: body,
        },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    };

    return this.sendRequest(data);
  }

  // Booking confirmation message
  static async sendBookingConfirmation(customerName: string, phone: string, bookingDetails: any) {
    const message = `🎾 *Booking Confirmed!*

Hi ${customerName},

Your sports booking has been confirmed:

🏆 *Sport:* ${bookingDetails.sport}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.timeSlots.join(', ')}
💰 *Amount:* ₹${bookingDetails.totalAmount}
📋 *Booking ID:* ${bookingDetails.bookingId}

⚠️ *Important:* Complete payment within 5 minutes to secure your slot.

*Payment Details:*
UPI ID: smartsatheesh7-1@okhdfcbank
Name: Smart Satheesh

After payment, reply with your transaction ID.

Thank you for choosing Sathiyan Sports! 🏅`;

    return this.sendTextMessage(phone, message);
  }

  // Payment reminder message
  static async sendPaymentReminder(customerName: string, phone: string, bookingDetails: any, minutesLeft: number) {
    const message = `⏰ *Payment Reminder*

Hi ${customerName},

Your booking payment is due in *${minutesLeft} minutes*!

🏆 ${bookingDetails.sport} - ₹${bookingDetails.totalAmount}
📋 Booking ID: ${bookingDetails.bookingId}

*Pay now to secure your slot:*
UPI: smartsatheesh7-1@okhdfcbank

Reply with transaction ID after payment.

- Sathiyan Sports 🏅`;

    return this.sendTextMessage(phone, message);
  }

  // Payment success message
  static async sendPaymentSuccess(customerName: string, phone: string, bookingDetails: any) {
    const message = `✅ *Payment Confirmed!*

Hi ${customerName},

Your payment has been received and booking is confirmed! 🎉

🏆 *Sport:* ${bookingDetails.sport}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.timeSlots.join(', ')}
💰 *Amount Paid:* ₹${bookingDetails.totalAmount}
🎫 *Booking ID:* ${bookingDetails.bookingId}

*Venue Details:*
📍 Sathiyan Sports Complex
📞 Contact: +91-XXXXXXXXXX

See you at the venue! 🏅

- Sathiyan Sports Team`;

    return this.sendTextMessage(phone, message);
  }

  // Booking cancellation message
  static async sendBookingCancellation(customerName: string, phone: string, bookingId: string, reason: string) {
    const message = `❌ *Booking Cancelled*

Hi ${customerName},

Your booking has been cancelled.

📋 *Booking ID:* ${bookingId}
🔍 *Reason:* ${reason}

You can book again anytime through our website.

Need help? Reply to this message.

- Sathiyan Sports 🏅`;

    return this.sendTextMessage(phone, message);
  }

  // Interactive message for payment options
  static async sendPaymentOptions(customerName: string, phone: string, bookingDetails: any) {
    const body = `Hi ${customerName}! 

Your booking is confirmed:
🏆 ${bookingDetails.sport} - ₹${bookingDetails.totalAmount}
📋 ID: ${bookingDetails.bookingId}

Choose your payment method:`;

    const buttons = [
      { id: 'upi_payment', title: '💳 UPI Payment' },
      { id: 'payment_help', title: '❓ Need Help' },
      { id: 'cancel_booking', title: '❌ Cancel' },
    ];

    return this.sendInteractiveMessage(phone, body, buttons);
  }

  // Handle webhook verification
  static verifyWebhook(mode: string, token: string, challenge: string) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified');
      return challenge;
    } else {
      console.log('WhatsApp webhook verification failed');
      return null;
    }
  }

  // Process incoming webhook messages
  static processIncomingMessage(body: any) {
    try {
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value?.messages) {
          const message = value.messages[0];
          const from = message.from;
          const messageId = message.id;
          const messageType = message.type;

          console.log('Incoming WhatsApp message:', {
            from,
            messageId,
            type: messageType,
            timestamp: message.timestamp,
          });

          // Handle different message types
          if (messageType === 'text') {
            const messageText = message.text.body.toLowerCase();
            
            // Check if it's a transaction ID
            if (messageText.match(/^[a-z0-9]{8,}$/i)) {
              console.log('Possible transaction ID received:', messageText);
              // You can process this transaction ID
              return {
                type: 'transaction_id',
                from,
                transactionId: messageText,
                messageId,
              };
            }
          } else if (messageType === 'interactive') {
            const buttonReply = message.interactive.button_reply;
            console.log('Button clicked:', buttonReply.id);
            
            return {
              type: 'button_click',
              from,
              buttonId: buttonReply.id,
              messageId,
            };
          }
        }

        // Handle message status updates
        if (value?.statuses) {
          const status = value.statuses[0];
          console.log('Message status update:', {
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
          });

          return {
            type: 'status_update',
            messageId: status.id,
            status: status.status,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      return null;
    }
  }
}
