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
    console.log('\n📱 =============== NOTIFICATION ===============');
    console.log(`🔔 Type: ${type}`);
    console.log(`🕐 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('📄 Details:');
    Object.entries(data).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('📱 =============================================\n');
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
