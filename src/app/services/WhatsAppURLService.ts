/**
 * Simple WhatsApp URL Service
 * No API keys or registration required - just generates WhatsApp URLs
 */

class WhatsAppURLService {
  private baseWhatsAppNumber: string;
  private adminNumber: string;

  constructor() {
    this.baseWhatsAppNumber = process.env.NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER || '919787020525';
    this.adminNumber = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN_NUMBER || '919787020525';
    
    console.log('📱 WhatsApp URL Service initialized');
    console.log(`📞 Business Number: ${this.baseWhatsAppNumber}`);
  }

  /**
   * Generate WhatsApp URL for OTP delivery
   */
  generateOTPUrl(phoneNumber: string, otp: string): string {
    const message = `🏸 *Sathiyan Sports - Password Reset*

Your OTP for password reset is: *${otp}*

⏰ Valid for 10 minutes only
🔒 Do not share this OTP with anyone

If you didn't request this, please ignore this message.

Thank you! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${this.baseWhatsAppNumber}?text=${encodedMessage}`;
  }

  /**
   * Generate WhatsApp URL for booking confirmation
   */
  generateBookingConfirmationUrl(
    bookingDetails: {
      bookingReference: string;
      courtName: string;
      date: string;
      time: string;
      amount: number;
      customerName: string;
      customerPhone: string;
    }
  ): string {
    const message = `🏸 *Booking Confirmed - Sathiyan Sports*

Hi ${bookingDetails.customerName}! 👋

✅ *Booking Reference:* ${bookingDetails.bookingReference}
🏟️ *Court:* ${bookingDetails.courtName}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.time}
💰 *Amount:* ₹${bookingDetails.amount}

💳 *Pay Now:* Reply to this message to confirm payment
📋 *UPI ID:* ${process.env.NEXT_PUBLIC_GPAY_UPI_ID}

Please complete payment within 24 hours.

Thank you for choosing Sathiyan Sports! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${bookingDetails.customerPhone}?text=${encodedMessage}`;
  }

  /**
   * Generate admin notification URL
   */
  generateAdminNotificationUrl(
    bookingDetails: {
      bookingReference: string;
      courtName: string;
      date: string;
      time: string;
      amount: number;
      customerName: string;
      customerPhone: string;
    }
  ): string {
    const message = `🚨 *New Booking Alert - Sathiyan Sports*

📋 *Booking Reference:* ${bookingDetails.bookingReference}
👤 *Customer:* ${bookingDetails.customerName}
📱 *Phone:* ${bookingDetails.customerPhone}
🏟️ *Court:* ${bookingDetails.courtName}
📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.time}
💰 *Amount:* ₹${bookingDetails.amount}

⚠️ *Action Required:* Monitor payment status`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${this.adminNumber}?text=${encodedMessage}`;
  }

  /**
   * Generate WhatsApp URL for custom message
   */
  generateCustomMessageUrl(phoneNumber: string, message: string): string {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  }

  /**
   * Send notification by opening WhatsApp (browser-based)
   */
  async sendNotification(type: 'otp' | 'booking' | 'admin' | 'custom', data: any): Promise<{
    success: boolean;
    whatsappUrl: string;
    message: string;
  }> {
    let whatsappUrl = '';
    let message = '';

    switch (type) {
      case 'otp':
        whatsappUrl = this.generateOTPUrl(data.phoneNumber, data.otp);
        message = 'Click to send OTP via WhatsApp';
        break;
      case 'booking':
        whatsappUrl = this.generateBookingConfirmationUrl(data);
        message = 'Click to send booking confirmation';
        break;
      case 'admin':
        whatsappUrl = this.generateAdminNotificationUrl(data);
        message = 'Click to notify admin';
        break;
      case 'custom':
        whatsappUrl = this.generateCustomMessageUrl(data.phoneNumber, data.message);
        message = 'Click to send custom message';
        break;
      default:
        return {
          success: false,
          whatsappUrl: '',
          message: 'Invalid notification type'
        };
    }

    // Log for development
    console.log(`📱 WhatsApp URL generated: ${whatsappUrl}`);

    return {
      success: true,
      whatsappUrl,
      message
    };
  }

  /**
   * Simple console-based notification for development
   */
  logNotification(type: string, data: any): void {
    console.log('\n📱 =============== WHATSAPP NOTIFICATION ===============');
    console.log(`🔔 Type: ${type.toUpperCase()}`);
    console.log('📄 Data:', JSON.stringify(data, null, 2));
    console.log('📱 ===================================================\n');
  }
}

// Export singleton instance
const whatsAppURLService = new WhatsAppURLService();
export default whatsAppURLService;
