/**
 * Unified WhatsApp Service with Multiple Fallback Options
 * Choose your preferred method by setting WHATSAPP_METHOD in .env
 */

import whatsAppCloudService from './WhatsAppCloudService';
import whatsAppURLService from './WhatsAppURLService';
import twilioWhatsAppService from './TwilioWhatsAppService';
import simpleNotificationService from './SimpleNotificationService';

type WhatsAppMethod = 'cloud' | 'twilio' | 'url' | 'simple';

class UnifiedWhatsAppService {
  private method: WhatsAppMethod;
  
  constructor() {
    // Determine which method to use based on environment
    this.method = this.determineMethod();
    console.log(`📱 Using WhatsApp method: ${this.method.toUpperCase()}`);
  }

  private determineMethod(): WhatsAppMethod {
    const envMethod = process.env.WHATSAPP_METHOD as WhatsAppMethod;
    
    // If explicitly set, use that method
    if (envMethod && ['cloud', 'twilio', 'url', 'simple'].includes(envMethod)) {
      return envMethod;
    }

    // Auto-detect based on available credentials
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return 'cloud';
    }
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return 'twilio';
    }

    // Default to simple console logging
    return 'simple';
  }

  /**
   * Send OTP using the configured method
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    whatsappUrl?: string;
    method: string;
  }> {
    console.log(`📱 Sending OTP via ${this.method} method`);

    switch (this.method) {
      case 'cloud':
        const cloudResult = await whatsAppCloudService.sendOTP(phoneNumber, otp);
        return { ...cloudResult, method: 'cloud' };
        
      case 'twilio':
        const twilioResult = await twilioWhatsAppService.sendOTP(phoneNumber, otp);
        return { ...twilioResult, method: 'twilio' };
        
      case 'url':
        const urlResult = await whatsAppURLService.sendNotification('otp', { phoneNumber, otp });
        return { 
          success: urlResult.success, 
          whatsappUrl: urlResult.whatsappUrl,
          method: 'url'
        };
        
      case 'simple':
      default:
        const simpleResult = await simpleNotificationService.sendOTP(phoneNumber, otp);
        return { ...simpleResult, method: 'simple' };
    }
  }

  /**
   * Send booking confirmation using the configured method
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
    console.log(`📱 Sending booking confirmation via ${this.method} method`);

    switch (this.method) {
      case 'cloud':
        return await whatsAppCloudService.sendBookingConfirmation(phoneNumber, bookingDetails);
        
      case 'twilio':
        return await twilioWhatsAppService.sendBookingConfirmation(phoneNumber, bookingDetails);
        
      case 'url':
        const urlResult = await whatsAppURLService.sendNotification('booking', { ...bookingDetails, customerPhone: phoneNumber });
        console.log(`🔗 WhatsApp URL: ${urlResult.whatsappUrl}`);
        return urlResult.success;
        
      case 'simple':
      default:
        return await simpleNotificationService.sendBookingConfirmation(phoneNumber, bookingDetails);
    }
  }

  /**
   * Send admin notification using the configured method
   */
  async sendAdminNotification(
    bookingDetails: {
      bookingReference: string;
      customerName: string;
      customerPhone: string;
      courtName: string;
      date: string;
      time: string;
      amount: number;
    }
  ): Promise<boolean> {
    console.log(`📱 Sending admin notification via ${this.method} method`);

    switch (this.method) {
      case 'cloud':
        return await whatsAppCloudService.sendAdminNotification(bookingDetails);
      
      case 'twilio':
        // Twilio doesn't have admin notification, use simple
        return await simpleNotificationService.sendAdminNotification(bookingDetails);
      
      case 'url':
        const urlResult = await whatsAppURLService.sendNotification('admin', bookingDetails);
        return urlResult.success;
      
      case 'simple':
      default:
        return await simpleNotificationService.sendAdminNotification(bookingDetails);
    }
  }

  /**
   * Send custom message using the configured method
   */
  async sendCustomMessage(phoneNumber: string, message: string): Promise<boolean> {
    console.log(`� Sending custom message via ${this.method} method to ${phoneNumber}`);

    switch (this.method) {
      case 'cloud':
        // Use cloud service for custom message
        try {
          const result = await whatsAppCloudService.sendOTP(phoneNumber, message); // Reuse OTP method for custom text
          return result.success;
        } catch {
          return false;
        }
      
      case 'twilio':
        // Use Twilio for custom message
        try {
          const result = await twilioWhatsAppService.sendOTP(phoneNumber, message); // Reuse OTP method for custom text
          return result.success;
        } catch {
          return false;
        }
      
      case 'url':
        // Generate WhatsApp URL for custom message
        const urlResult = await whatsAppURLService.sendNotification('custom', { 
          phoneNumber, 
          message 
        });
        return urlResult.success;
      
      case 'simple':
      default:
        // Use simple notification for custom message
        console.log('\n📱 =============== CUSTOM MESSAGE NOTIFICATION ===============');
        console.log(`🔔 Type: CUSTOM MESSAGE`);
        console.log(`🕐 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`📱 Method: SIMPLE (Console + URLs)`);
        console.log('📄 Details:');
        console.log(`   📞 phoneNumber: ${phoneNumber}`);
        console.log(`   💬 message: ${message}`);
        
        // Generate WhatsApp URL
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        console.log(`   🔗 WhatsApp URL: ${whatsappUrl}`);
        console.log('📱 ===================================================================\n');
        
        return true;
    }
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    const baseStatus = {
      currentMethod: this.method,
      available: {
        cloud: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
        twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        url: true, // Always available
        simple: true // Always available
      }
    };

    switch (this.method) {
      case 'cloud':
        return { ...baseStatus, service: whatsAppCloudService.getStatus() };
      case 'twilio':
        return { ...baseStatus, service: twilioWhatsAppService.getStatus() };
      case 'url':
        return { ...baseStatus, service: { type: 'URL Generation', configured: true } };
      case 'simple':
      default:
        return { ...baseStatus, service: simpleNotificationService.getStatus() };
    }
  }

  /**
   * Switch to a different method programmatically
   */
  switchMethod(newMethod: WhatsAppMethod) {
    this.method = newMethod;
    console.log(`📱 Switched to ${newMethod.toUpperCase()} method`);
  }
}

// Export singleton
const unifiedWhatsAppService = new UnifiedWhatsAppService();
export default unifiedWhatsAppService;
