// SMS Service using Twilio
import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = new Twilio(accountSid, authToken);

export interface SMSOptions {
  to: string;
  message: string;
  bookingId?: string;
}

export class SMSService {
  static async sendSMS({ to, message, bookingId }: SMSOptions) {
    try {
      if (!accountSid || !authToken || !fromNumber) {
        console.error('Twilio credentials not configured');
        return { success: false, error: 'SMS service not configured' };
      }

      // Format phone number (ensure it starts with country code)
      const formattedTo = to.startsWith('+') ? to : `+91${to.replace(/\D/g, '')}`;

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo,
      });

      console.log(`SMS sent successfully to ${formattedTo}, SID: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid,
        to: formattedTo,
      };
    } catch (error: any) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  // Booking confirmation SMS
  static async sendBookingConfirmation(customerName: string, phone: string, bookingDetails: any) {
    const message = `Hi ${customerName}! Your booking is confirmed.
🏆 Sport: ${bookingDetails.sport}
📅 Date: ${bookingDetails.date}
⏰ Time: ${bookingDetails.timeSlots.join(', ')}
💰 Amount: ₹${bookingDetails.totalAmount}
📋 Booking ID: ${bookingDetails.bookingId}

Complete payment within 5 minutes to secure your slot.
UPI: smartsatheesh7-1@okhdfcbank

- Sathiyan Sports`;

    return this.sendSMS({
      to: phone,
      message,
      bookingId: bookingDetails.bookingId,
    });
  }

  // Payment reminder SMS
  static async sendPaymentReminder(customerName: string, phone: string, bookingDetails: any) {
    const message = `⏰ Payment Reminder - ${customerName}
Your booking expires in 2 minutes!
🏆 ${bookingDetails.sport} - ₹${bookingDetails.totalAmount}
📋 ID: ${bookingDetails.bookingId}

Pay now: UPI - smartsatheesh7-1@okhdfcbank
- Sathiyan Sports`;

    return this.sendSMS({
      to: phone,
      message,
      bookingId: bookingDetails.bookingId,
    });
  }

  // Payment success SMS
  static async sendPaymentSuccess(customerName: string, phone: string, bookingDetails: any) {
    const message = `✅ Payment Confirmed - ${customerName}
Your booking is now secured!
🏆 Sport: ${bookingDetails.sport}
📅 Date: ${bookingDetails.date}
⏰ Time: ${bookingDetails.timeSlots.join(', ')}
💰 Paid: ₹${bookingDetails.totalAmount}
🎫 Booking ID: ${bookingDetails.bookingId}

See you at the venue!
- Sathiyan Sports`;

    return this.sendSMS({
      to: phone,
      message,
      bookingId: bookingDetails.bookingId,
    });
  }

  // Booking cancellation SMS
  static async sendBookingCancellation(customerName: string, phone: string, bookingId: string, reason: string = 'Payment not completed') {
    const message = `❌ Booking Cancelled - ${customerName}
Booking ID: ${bookingId}
Reason: ${reason}

Please book again if needed.
- Sathiyan Sports`;

    return this.sendSMS({
      to: phone,
      message,
      bookingId,
    });
  }
}
