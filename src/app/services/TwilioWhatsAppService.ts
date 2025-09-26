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
    const fromEnv = process.env.TWILIO_WHATSAPP_FROM;
    
    // Set default Twilio sandbox number with proper validation
    this.fromNumber = fromEnv || 'whatsapp:+14155238886';
    
    // Log the configuration for debugging
    console.log('🔧 Twilio Configuration:');
    console.log(`   Account SID: ${accountSid ? accountSid.substring(0, 10) + '...' : 'Not set'}`);
    console.log(`   Auth Token: ${authToken ? 'Set (' + authToken.length + ' chars)' : 'Not set'}`);
    console.log(`   From Number: ${this.fromNumber}`);
    
    // Validate and fix the from number format
    if (!this.fromNumber.startsWith('whatsapp:+')) {
      console.log('⚠️ Invalid from number format, fixing...');
      if (this.fromNumber.startsWith('+')) {
        this.fromNumber = `whatsapp:${this.fromNumber}`;
      } else if (this.fromNumber.match(/^\d+$/)) {
        this.fromNumber = `whatsapp:+${this.fromNumber}`;
      } else {
        console.log('❌ Invalid from number, using Twilio sandbox default');
        this.fromNumber = 'whatsapp:+14155238886'; // Fallback to sandbox
      }
      console.log(`   Corrected From Number: ${this.fromNumber}`);
    }

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      console.log('📱 Twilio WhatsApp Service initialized successfully');
    } else {
      console.log('⚠️ Twilio credentials missing - service disabled');
      console.log(`   Missing: ${!accountSid ? 'ACCOUNT_SID ' : ''}${!authToken ? 'AUTH_TOKEN' : ''}`);
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
          error: 'Twilio client not configured - check credentials'
        };
      }

      // Validate from number before sending
      if (!this.fromNumber || this.fromNumber.length < 10) {
        console.error('❌ Invalid from number:', this.fromNumber);
        return {
          success: false,
          error: `Invalid from number: ${this.fromNumber}`
        };
      }

      // Format phone number for WhatsApp with proper country code
      const cleanTo = to.replace(/[^0-9]/g, '');
      let toNumber: string;
      
      // Handle Indian phone numbers (10 digits starting with 6-9)
      if (cleanTo.length === 10 && /^[6-9]/.test(cleanTo)) {
        // Indian mobile number - add +91 country code
        toNumber = `whatsapp:+91${cleanTo}`;
      } else if (cleanTo.length === 12 && cleanTo.startsWith('91')) {
        // Already has 91 country code
        toNumber = `whatsapp:+${cleanTo}`;
      } else if (cleanTo.length === 13 && cleanTo.startsWith('919')) {
        // Has 919 prefix, use as is
        toNumber = `whatsapp:+${cleanTo}`;
      } else {
        // For other international numbers, use as formatted
        toNumber = `whatsapp:+${cleanTo}`;
      }
      
      console.log('📱 Sending Twilio WhatsApp message:');
      console.log(`   From: ${this.fromNumber}`);
      console.log(`   To: ${toNumber} (formatted from ${to})`);
      console.log(`   Clean number: ${cleanTo} (${cleanTo.length} digits)`);
      console.log(`   Message: ${message.substring(0, 50)}...`);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: toNumber
      });

      console.log(`✅ Twilio WhatsApp message sent successfully: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid
      };

    } catch (error: any) {
      console.error('❌ Twilio WhatsApp Error Details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        fromNumber: this.fromNumber
      });
      
      let errorMessage = error.message || 'Failed to send message';
      
      // Handle specific Twilio errors
      if (error.code === 21212) {
        errorMessage = `Invalid 'From' number: ${this.fromNumber}. Check TWILIO_WHATSAPP_FROM in .env.local`;
      } else if (error.code === 21211) {
        errorMessage = `Invalid 'To' number format. Recipient may not have joined Twilio sandbox.`;
      } else if (error.code === 20003) {
        errorMessage = `Authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN`;
      }
      
      return {
        success: false,
        error: errorMessage
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

  /**
   * Test phone number formatting
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleanTo = phoneNumber.replace(/[^0-9]/g, '');
    
    // Handle Indian phone numbers (10 digits starting with 6-9)
    if (cleanTo.length === 10 && /^[6-9]/.test(cleanTo)) {
      return `whatsapp:+91${cleanTo}`;
    } else if (cleanTo.length === 12 && cleanTo.startsWith('91')) {
      return `whatsapp:+${cleanTo}`;
    } else if (cleanTo.length === 13 && cleanTo.startsWith('919')) {
      return `whatsapp:+${cleanTo}`;
    } else {
      return `whatsapp:+${cleanTo}`;
    }
  }

  /**
   * Validate Twilio configuration
   */
  validateConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!process.env.TWILIO_ACCOUNT_SID) {
      issues.push('TWILIO_ACCOUNT_SID is missing');
    } else if (!process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
      issues.push('TWILIO_ACCOUNT_SID should start with "AC"');
    }
    
    if (!process.env.TWILIO_AUTH_TOKEN) {
      issues.push('TWILIO_AUTH_TOKEN is missing');
    }
    
    if (!this.fromNumber) {
      issues.push('TWILIO_WHATSAPP_FROM is missing');
    } else if (!this.fromNumber.startsWith('whatsapp:+')) {
      issues.push(`TWILIO_WHATSAPP_FROM has invalid format: ${this.fromNumber}`);
    }
    
    if (!this.client) {
      issues.push('Twilio client not initialized');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
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
