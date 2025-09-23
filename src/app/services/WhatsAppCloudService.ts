interface WhatsAppCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
}

class WhatsAppCloudService {
  private config: WhatsAppCloudConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      apiVersion: 'v18.0'
    };
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
    
    console.log('🔧 WhatsApp Cloud Service initialized');
    console.log(`📱 Phone Number ID: ${this.config.phoneNumberId ? 'Set' : 'Missing'}`);
    console.log(`🔑 Access Token: ${this.config.accessToken ? 'Set' : 'Missing'}`);
  }

  /**
   * Send OTP using WhatsApp Cloud API with template message
   */
  async sendOTP(to: string, otp: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Validate configuration
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        console.error('❌ WhatsApp Cloud API not configured');
        return {
          success: false,
          error: 'WhatsApp Cloud API not configured. Please check environment variables.'
        };
      }

      // Format phone number (remove + and add country code if needed)
      const formattedPhone = this.formatPhoneNumber(to);
      console.log(`📱 Sending OTP to: ${formattedPhone}`);

      const messagePayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'hello_world',
          language: {
            code: 'en_US'
          }
        }
      };

      console.log(`📱 Attempting to send WhatsApp template message`);
      console.log(`💬 Template: hello_world`);

      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload)
      });

      const responseData = await response.json();
      console.log('📥 WhatsApp Template Response:', JSON.stringify(responseData, null, 2));

      if (response.ok && responseData.messages && responseData.messages[0]) {
        const messageId = responseData.messages[0].id;
        console.log(`✅ WhatsApp message sent successfully! Message ID: ${messageId}`);
        
        // Also log the OTP for development
        console.log(`🔐 OTP sent via WhatsApp: ${otp} to ${formattedPhone}`);
        
        return {
          success: true,
          messageId: messageId
        };
      } else {
        console.error('❌ WhatsApp API Error:', responseData);
        return {
          success: false,
          error: responseData.error?.message || 'Failed to send WhatsApp message'
        };
      }

    } catch (error) {
      console.error('❌ WhatsApp Cloud API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send OTP using text message (for development/testing)
   */
  async sendOTPText(to: string, message: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Validate configuration
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        console.error('❌ WhatsApp Cloud API not configured');
        return {
          success: false,
          error: 'WhatsApp Cloud API not configured. Please check environment variables.'
        };
      }

      const formattedPhone = this.formatPhoneNumber(to);

      const messagePayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      };

      console.log(`📱 Sending text message to: ${formattedPhone}`);
      console.log(`💬 Message: ${message}`);

      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload)
      });

      const responseData = await response.json();
      console.log('📥 WhatsApp Text Response:', JSON.stringify(responseData, null, 2));

      if (response.ok && responseData.messages && responseData.messages[0]) {
        return {
          success: true,
          messageId: responseData.messages[0].id
        };
      } else {
        return {
          success: false,
          error: responseData.error?.message || 'Failed to send text message'
        };
      }

    } catch (error) {
      console.error('❌ WhatsApp Text Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send booking confirmation message
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
    try {
      const message = `🏸 *Booking Confirmed - Sathiyan Sports*

Hi ${bookingDetails.customerName}! 👋

✅ *Booking Reference:* ${bookingDetails.bookingReference}
🏟️ *Court:* ${bookingDetails.courtName}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.time}
💰 *Amount:* ₹${bookingDetails.amount}

💳 *Pay Now via WhatsApp:*
https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER}?text=Hi!%20I%20want%20to%20make%20a%20payment%20of%20₹${bookingDetails.amount}%20for%20booking%20${bookingDetails.bookingReference}.%20Customer:%20${encodeURIComponent(bookingDetails.customerName)}

📋 *Payment via UPI:*
UPI ID: ${process.env.NEXT_PUBLIC_GPAY_UPI_ID}

Please complete payment within 24 hours to confirm your slot.

Thank you for choosing Sathiyan Sports! 🙏`;

      const result = await this.sendOTPText(phoneNumber, message);
      return result.success;
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error);
      return false;
    }
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(
    bookingDetails: {
      bookingReference: string;
      courtName: string;
      date: string;
      time: string;
      amount: number;
      customerName: string;
      customerPhone: string;
    }
  ): Promise<boolean> {
    try {
      const adminNumber = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN_NUMBER || '';
      if (!adminNumber) {
        console.log('⚠️ Admin WhatsApp number not configured');
        return false;
      }

      const message = `🚨 *New Booking Alert - Sathiyan Sports*

📋 *Booking Reference:* ${bookingDetails.bookingReference}
👤 *Customer:* ${bookingDetails.customerName}
📱 *Phone:* ${bookingDetails.customerPhone}
🏟️ *Court:* ${bookingDetails.courtName}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.time}
💰 *Amount:* ₹${bookingDetails.amount}

⚠️ *Action Required:* Monitor payment status

Admin Dashboard: https://sathiyansports.fit/admin`;

      const result = await this.sendOTPText(adminNumber, message);
      return result.success;
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      return false;
    }
  }

  /**
   * Format phone number for WhatsApp Cloud API
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, + signs, or other formatting
    let formatted = phone.replace(/[\s+\-()]/g, '');
    
    // If it's an Indian number without country code, add 91
    if (formatted.length === 10 && formatted.match(/^[6-9]/)) {
      formatted = '91' + formatted;
    }
    
    return formatted;
  }

  /**
   * Get service status
   */
  getStatus(): {
    configured: boolean;
    phoneNumberId: boolean;
    accessToken: boolean;
  } {
    return {
      configured: !!(this.config.accessToken && this.config.phoneNumberId),
      phoneNumberId: !!this.config.phoneNumberId,
      accessToken: !!this.config.accessToken
    };
  }

  /**
   * Send payment reminder message
   */
  async sendPaymentReminder(
    phoneNumber: string,
    bookingDetails: {
      bookingReference: string;
      amount: number;
      customerName: string;
    }
  ): Promise<boolean> {
    try {
      const message = `⏰ *Payment Reminder - Sathiyan Sports*

Hi ${bookingDetails.customerName}! 👋

Your booking ${bookingDetails.bookingReference} is pending payment.

💰 *Amount Due:* ₹${bookingDetails.amount}

💳 *Pay Now:*
https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER}?text=Hi!%20I%20want%20to%20make%20a%20payment%20of%20₹${bookingDetails.amount}%20for%20booking%20${bookingDetails.bookingReference}.%20Customer:%20${encodeURIComponent(bookingDetails.customerName)}

📋 *UPI ID:* ${process.env.NEXT_PUBLIC_GPAY_UPI_ID}

Please complete payment to confirm your slot.

Thank you! 🙏`;

      const result = await this.sendOTPText(phoneNumber, message);
      return result.success;
    } catch (error) {
      console.error('❌ Error sending payment reminder:', error);
      return false;
    }
  }

  /**
   * Send payment confirmation message
   */
  async sendPaymentConfirmation(
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
    try {
      const message = `✅ *Payment Confirmed - Sathiyan Sports*

Hi ${bookingDetails.customerName}! 🎉

Your payment has been confirmed!

📋 *Booking Reference:* ${bookingDetails.bookingReference}
🏟️ *Court:* ${bookingDetails.courtName}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.time}
💰 *Amount Paid:* ₹${bookingDetails.amount}

✅ *Status:* CONFIRMED

📍 *Venue:* Sathiyan Sports Complex
🕐 Please arrive 15 minutes before your slot

See you on the court! 🏸

Thank you for choosing Sathiyan Sports! 🙏`;

      const result = await this.sendOTPText(phoneNumber, message);
      return result.success;
    } catch (error) {
      console.error('❌ Error sending payment confirmation:', error);
      return false;
    }
  }

  /**
   * Send cancellation notification message
   */
  async sendCancellationNotification(
    phoneNumber: string,
    bookingDetails: {
      bookingReference: string;
      customerName: string;
      refundAmount?: number;
    }
  ): Promise<boolean> {
    try {
      const refundMessage = bookingDetails.refundAmount 
        ? `💰 *Refund:* ₹${bookingDetails.refundAmount} will be processed within 5-7 business days.`
        : '';

      const message = `❌ *Booking Cancelled - Sathiyan Sports*

Hi ${bookingDetails.customerName}! 

Your booking has been cancelled:

📋 *Booking Reference:* ${bookingDetails.bookingReference}
🔴 *Status:* CANCELLED

${refundMessage}

For any queries, please contact us on WhatsApp.

We hope to serve you again soon! 🙏`;

      const result = await this.sendOTPText(phoneNumber, message);
      return result.success;
    } catch (error) {
      console.error('❌ Error sending cancellation notification:', error);
      return false;
    }
  }

  /**
   * Test the WhatsApp Cloud API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    phoneNumber?: string;
    error?: string;
  }> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp Cloud API not configured'
        };
      }

      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        }
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          phoneNumber: data.display_phone_number
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to test connection'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
const whatsAppCloudService = new WhatsAppCloudService();
export default whatsAppCloudService;
