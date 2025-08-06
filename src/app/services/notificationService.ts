// Unified Notification Service
//import { SMSService } from './smsService';
//import { PushNotificationService } from './pushNotificationService';
import { WhatsAppService } from './whatsappService';

export interface NotificationPreferences {
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
}

export interface UserNotificationData {
  name: string;
  phone: string;
  email: string;
  fcmTokens?: string[];
  webPushSubscriptions?: any[];
  preferences: NotificationPreferences;
}

export class NotificationService {
  // Send booking confirmation across all channels
  static async sendBookingConfirmation(
    user: UserNotificationData,
    bookingDetails: any
  ) {
    const results: any[] = [];

    try {
      // SMS Notification
     /*  if (user.preferences.sms) {
        const smsResult = await SMSService.sendBookingConfirmation(
          user.name,
          user.phone,
          bookingDetails
        );
        results.push({ type: 'sms', ...smsResult });
      }

      // Push Notification
      if (user.preferences.push && (user.fcmTokens || user.webPushSubscriptions)) {
        const pushResult = await PushNotificationService.sendBookingConfirmation(
          {
            fcm: user.fcmTokens,
            webPush: user.webPushSubscriptions,
          },
          bookingDetails
        );
        results.push({ type: 'push', results: pushResult });
      } */

      // WhatsApp Notification
      if (user.preferences.whatsapp) {
        const whatsappResult = await WhatsAppService.sendBookingConfirmation(
          user.name,
          user.phone,
          bookingDetails
        );
        results.push({ type: 'whatsapp', ...whatsappResult });
      }

      console.log('Booking confirmation notifications sent:', results);
      return {
        success: true,
        results,
        summary: this.generateSummary(results),
      };
    } catch (error: any) {
      console.error('Error sending booking confirmation notifications:', error);
      return {
        success: false,
        error: error.message,
        results,
      };
    }
  }

  // Send payment reminder across all channels
  static async sendPaymentReminder(
    user: UserNotificationData,
    bookingDetails: any,
    minutesLeft: number
  ) {
    const results: any[] = [];

    try {
      // SMS Notification
     /*  if (user.preferences.sms) {
        const smsResult = await SMSService.sendPaymentReminder(
          user.name,
          user.phone,
          bookingDetails
        );
        results.push({ type: 'sms', ...smsResult });
      }

      // Push Notification
      if (user.preferences.push && (user.fcmTokens || user.webPushSubscriptions)) {
        const pushResult = await PushNotificationService.sendPaymentReminder(
          {
            fcm: user.fcmTokens,
            webPush: user.webPushSubscriptions,
          },
          bookingDetails,
          minutesLeft
        );
        results.push({ type: 'push', results: pushResult });
      } */

      // WhatsApp Notification
      if (user.preferences.whatsapp) {
        const whatsappResult = await WhatsAppService.sendPaymentReminder(
          user.name,
          user.phone,
          bookingDetails,
          minutesLeft
        );
        results.push({ type: 'whatsapp', ...whatsappResult });
      }

      console.log('Payment reminder notifications sent:', results);
      return {
        success: true,
        results,
        summary: this.generateSummary(results),
      };
    } catch (error: any) {
      console.error('Error sending payment reminder notifications:', error);
      return {
        success: false,
        error: error.message,
        results,
      };
    }
  }

  // Send payment success across all channels
  static async sendPaymentSuccess(
    user: UserNotificationData,
    bookingDetails: any
  ) {
    const results: any[] = [];

    try {
      // SMS Notification
    /*   if (user.preferences.sms) {
        const smsResult = await SMSService.sendPaymentSuccess(
          user.name,
          user.phone,
          bookingDetails
        );
        results.push({ type: 'sms', ...smsResult });
      }

      // Push Notification
      if (user.preferences.push && (user.fcmTokens || user.webPushSubscriptions)) {
        const pushResult = await PushNotificationService.sendPaymentSuccess(
          {
            fcm: user.fcmTokens,
            webPush: user.webPushSubscriptions,
          },
          bookingDetails
        );
        results.push({ type: 'push', results: pushResult });
      } */

      // WhatsApp Notification
      if (user.preferences.whatsapp) {
        const whatsappResult = await WhatsAppService.sendPaymentSuccess(
          user.name,
          user.phone,
          bookingDetails
        );
        results.push({ type: 'whatsapp', ...whatsappResult });
      }

      console.log('Payment success notifications sent:', results);
      return {
        success: true,
        results,
        summary: this.generateSummary(results),
      };
    } catch (error: any) {
      console.error('Error sending payment success notifications:', error);
      return {
        success: false,
        error: error.message,
        results,
      };
    }
  }

  // Send booking cancellation across all channels
  static async sendBookingCancellation(
    user: UserNotificationData,
    bookingId: string,
    reason: string = 'Payment not completed'
  ) {
    const results: any[] = [];

    try {
      // SMS Notification
    /*   if (user.preferences.sms) {
        const smsResult = await SMSService.sendBookingCancellation(
          user.name,
          user.phone,
          bookingId,
          reason
        );
        results.push({ type: 'sms', ...smsResult });
      }

      // Push Notification
      if (user.preferences.push && (user.fcmTokens || user.webPushSubscriptions)) {
        const pushResult = await PushNotificationService.sendBookingCancellation(
          {
            fcm: user.fcmTokens,
            webPush: user.webPushSubscriptions,
          },
          bookingId,
          reason
        );
        results.push({ type: 'push', results: pushResult });
      }
 */
      // WhatsApp Notification
      if (user.preferences.whatsapp) {
        const whatsappResult = await WhatsAppService.sendBookingCancellation(
          user.name,
          user.phone,
          bookingId,
          reason
        );
        results.push({ type: 'whatsapp', ...whatsappResult });
      }

      console.log('Booking cancellation notifications sent:', results);
      return {
        success: true,
        results,
        summary: this.generateSummary(results),
      };
    } catch (error: any) {
      console.error('Error sending booking cancellation notifications:', error);
      return {
        success: false,
        error: error.message,
        results,
      };
    }
  }

  // Generate summary of notification results
  private static generateSummary(results: any[]) {
    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      channels: {
        sms: { sent: false, success: false },
        push: { sent: false, success: false },
        whatsapp: { sent: false, success: false },
      },
    };

    results.forEach(result => {
      if (result.type in summary.channels) {
        summary.channels[result.type as keyof typeof summary.channels].sent = true;
        if (result.success) {
          summary.channels[result.type as keyof typeof summary.channels].success = true;
          summary.successful++;
        } else {
          summary.failed++;
        }
      }
    });

    return summary;
  }

  // Test all notification services
  static async testNotifications(user: UserNotificationData) {
    const testBooking = {
      bookingId: 'TEST_' + Date.now(),
      sport: 'Cricket',
      date: new Date().toISOString().split('T')[0],
      timeSlots: ['10:00 AM'],
      totalAmount: 699,
    };

    console.log('Testing notification services for user:', user.name);
    
    const result = await this.sendBookingConfirmation(user, testBooking);
    console.log('Test notification results:', result);
    
    return result;
  }
}
