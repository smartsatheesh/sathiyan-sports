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
      courtName: string;
      date: string;
      time: string;
      amount: number;
      customerName: string;
      customerPhone: string;
    }
  ): Promise<boolean> {
    console.log(`📱 Sending admin notification via ${this.method} method`);

    switch (this.method) {
      case 'cloud':
        return await whatsAppCloudService.sendAdminNotification(bookingDetails);
        
      case 'twilio':
        // Twilio would need admin notification method - using simple for now
        return await simpleNotificationService.sendAdminNotification(bookingDetails);
        
      case 'url':
        const urlResult = await whatsAppURLService.sendNotification('admin', bookingDetails);
        console.log(`🔗 Admin WhatsApp URL: ${urlResult.whatsappUrl}`);
        return urlResult.success;
        
      case 'simple':
      default:
        return await simpleNotificationService.sendAdminNotification(bookingDetails);
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
