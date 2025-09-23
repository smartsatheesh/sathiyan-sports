/**
 * Twilio WhatsApp Service
 * Requires Twilio account but much simpler setup than Meta
 */

import twilio from 'twilio';

class TwilioWhatsAppService {
  private client: any;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio Sandbox

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      console.log('📱 Twilio WhatsApp Service initialized');
    } else {
      console.log('⚠️ Twilio credentials missing - service disabled');
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendMessage(to: string, message: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'Twilio not configured'
        };
      }

      // Format phone number for WhatsApp
      const toNumber = `whatsapp:+${to.replace(/[^0-9]/g, '')}`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: toNumber
      });

      console.log(`✅ Twilio WhatsApp message sent: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid
      };

    } catch (error: any) {
      console.error('❌ Twilio WhatsApp Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  /**
   * Send OTP via Twilio WhatsApp
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const message = `🏸 *Sathiyan Sports - Password Reset*

Your OTP: *${otp}*

Valid for 10 minutes only.
Do not share this code.

Thank you! 🙏`;

    return await this.sendMessage(phoneNumber, message);
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(
    phoneNumber: string,
    bookingDetails: {
      bookingReference: string;
      courtName: string;
      date: string;
      time: string;
      amount: number;
      customerName: string;
    }
  ): Promise<boolean> {
    const message = `🏸 *Booking Confirmed*

Hi ${bookingDetails.customerName}!

✅ Ref: ${bookingDetails.bookingReference}
🏟️ Court: ${bookingDetails.courtName}
📅 Date: ${bookingDetails.date}
⏰ Time: ${bookingDetails.time}
💰 Amount: ₹${bookingDetails.amount}

Payment: ${process.env.NEXT_PUBLIC_GPAY_UPI_ID}

Thank you! 🙏`;

    const result = await this.sendMessage(phoneNumber, message);
    return result.success;
  }

  getStatus() {
    return {
      configured: !!this.client,
      service: 'Twilio WhatsApp'
    };
  }
}

// Export singleton
const twilioWhatsAppService = new TwilioWhatsAppService();
export default twilioWhatsAppService;
