/**
 * Simple Notification Service with Email Fallback
 * No external APIs required - uses console logging + email
 */

import nodemailer from 'nodemailer';

class SimpleNotificationService {
  private emailTransporter: any;
  private emailConfigured: boolean = false;

  constructor() {
    this.initializeEmail();
    console.log('📧 Simple Notification Service initialized');
  }

  private initializeEmail() {
    try {
      if (process.env.EMAIL_SERVER_HOST) {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.EMAIL_SERVER_HOST,
          port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        });
        this.emailConfigured = true;
        console.log('📧 Email fallback configured');
      }
    } catch (error) {
      console.log('⚠️ Email not configured - using console only');
    }
  }

  /**
   * Send OTP notification
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    whatsappUrl?: string;
  }> {
    // Log to console for development
    this.logNotification('OTP', { phoneNumber, otp });

    // Generate WhatsApp URL for manual sending
    const message = `🏸 Sathiyan Sports - Your OTP: ${otp}`;
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;

    console.log(`📱 WhatsApp URL: ${whatsappUrl}`);
    console.log(`📋 Manual Message: "Your OTP is ${otp}"`);

    // Try email fallback if configured
    if (this.emailConfigured) {
      try {
        await this.sendEmailNotification(
          'OTP for Password Reset',
          `Your OTP is: ${otp}. Valid for 10 minutes.`,
          phoneNumber
        );
      } catch (error) {
        console.log('📧 Email fallback failed:', error);
      }
    }

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      whatsappUrl
    };
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
    const message = `🏸 Booking Confirmed!
Customer: ${bookingDetails.customerName}
Booking: ${bookingDetails.bookingReference}
Court: ${bookingDetails.courtName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Amount: ₹${bookingDetails.amount}`;

    this.logNotification('BOOKING CONFIRMATION', { phoneNumber, ...bookingDetails });

    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    console.log(`📱 Send this manually: ${whatsappUrl}`);

    return true;
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
    const adminPhone = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN_NUMBER || '919787020525';
    
    const message = `🚨 New Booking Alert!
Customer: ${bookingDetails.customerName} (${bookingDetails.customerPhone})
Booking: ${bookingDetails.bookingReference}
Court: ${bookingDetails.courtName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Amount: ₹${bookingDetails.amount}`;

    this.logNotification('ADMIN ALERT', bookingDetails);

    const whatsappUrl = `https://wa.me/${adminPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    console.log(`📱 Admin notification URL: ${whatsappUrl}`);

    return true;
  }

  /**
   * Send email notification as fallback
   */
  private async sendEmailNotification(subject: string, text: string, phone: string) {
    if (!this.emailConfigured) return;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@sathiyansports.fit',
      to: 'admin@sathiyansports.fit', // You can customize this
      subject: `[Sathiyan Sports] ${subject}`,
      text: `${text}\n\nPhone: ${phone}`,
    };

    await this.emailTransporter.sendMail(mailOptions);
    console.log('📧 Email notification sent');
  }

  /**
   * Log notification to console with nice formatting
   */
  private logNotification(type: string, data: any) {
    const timestamp = new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    console.log('\n📱 ================== SIMPLE WHATSAPP NOTIFICATION ==================');
    console.log(`🔔 Type: ${type}`);
    console.log(`🕐 Time: ${timestamp}`);
    console.log(`📱 Method: SIMPLE (Console + URLs)`);
    console.log('📄 Details:');
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'phoneNumber') {
        console.log(`   📞 ${key}: ${value}`);
      } else if (key === 'otp') {
        console.log(`   🔑 ${key}: ${value}`);
      } else if (key === 'bookingReference') {
        console.log(`   📋 ${key}: ${value}`);
      } else if (key === 'amount') {
        console.log(`   💰 ${key}: ₹${value}`);
      } else {
        console.log(`   📝 ${key}: ${value}`);
      }
    });

    // Generate and log WhatsApp URLs
    if (type === 'BOOKING CONFIRMATION' && data.phoneNumber) {
      const customerMessage = `🏸 *Booking Confirmed*

Hi ${data.customerName}!

✅ Ref: ${data.bookingReference}
🏟️ Court: ${data.courtName}
📅 Date: ${data.date}
⏰ Time: ${data.time}
💰 Amount: ₹${data.amount}

Payment: ${process.env.NEXT_PUBLIC_GPAY_UPI_ID}

Thank you! 🙏`;

      const customerUrl = `https://wa.me/${data.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customerMessage)}`;
      
      console.log('� WhatsApp URLs Generated:');
      console.log(`   🔗 Customer URL: ${customerUrl}`);
      
      // Admin notification URL
      const adminMessage = `🚨 *New Booking Alert*

Customer: ${data.customerName} (${data.phoneNumber})
Booking: ${data.bookingReference}
Court: ${data.courtName}
Date: ${data.date}
Time: ${data.time}
Amount: ₹${data.amount}`;

      const adminPhone = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN_NUMBER || '919787020525';
      const adminUrl = `https://wa.me/${adminPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(adminMessage)}`;
      console.log(`   🔗 Admin URL: ${adminUrl}`);
    }

    if (type === 'OTP' && data.phoneNumber) {
      const otpMessage = `🏸 *Sathiyan Sports - Password Reset*

Your OTP: *${data.otp}*

Valid for 10 minutes only.
Do not share this code.

Thank you! 🙏`;

      const otpUrl = `https://wa.me/${data.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(otpMessage)}`;
      console.log('📱 WhatsApp URL Generated:');
      console.log(`   🔗 OTP URL: ${otpUrl}`);
    }

    console.log('📱 ===================================================================\n');
  }

  /**
   * Generate WhatsApp URLs for manual sending
   */
  generateWhatsAppUrls(type: string, phoneNumber: string, data: any): {
    customerUrl?: string;
    adminUrl?: string;
  } {
    const result: any = {};

    if (type === 'booking') {
      const customerMessage = `Hi ${data.customerName}! Your booking ${data.bookingReference} is confirmed for ${data.date} at ${data.time}. Amount: ₹${data.amount}. UPI: ${process.env.NEXT_PUBLIC_GPAY_UPI_ID}`;
      result.customerUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customerMessage)}`;

      const adminMessage = `New booking: ${data.bookingReference} by ${data.customerName} (${phoneNumber}) for ₹${data.amount}`;
      const adminPhone = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN_NUMBER || '919787020525';
      result.adminUrl = `https://wa.me/${adminPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(adminMessage)}`;
    }

    return result;
  }

  getStatus() {
    return {
      service: 'Simple Console + Email',
      emailConfigured: this.emailConfigured,
      whatsappMethod: 'Manual URL Generation'
    };
  }
}

// Export singleton
const simpleNotificationService = new SimpleNotificationService();
export default simpleNotificationService;
