// Push Notification Service using Firebase Cloud Messaging and Web Push
import * as admin from 'firebase-admin';
import webpush from 'web-push';

// Initialize Firebase Admin (you'll need to add your service account key)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.log('Firebase admin initialization error:', error);
  }
}

// Configure Web Push (for browsers)
webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export interface PushNotificationData {
  userId?: string;
  fcmToken?: string;
  webPushSubscription?: any;
  title: string;
  body: string;
  data?: any;
  icon?: string;
  badge?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class PushNotificationService {
  // Send FCM notification (for mobile apps)
  static async sendFCMNotification(tokens: string | string[], notification: PushNotificationData) {
    try {
      if (!admin.apps.length) {
        console.error('Firebase not initialized');
        return { success: false, error: 'Firebase not configured' };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/logo.png',
        },
        data: notification.data || {},
        tokens: Array.isArray(tokens) ? tokens : [tokens],
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log('FCM notifications sent:', response.successCount);
      if (response.failureCount > 0) {
        console.log('FCM failures:', response.responses.filter((r: any) => !r.success));
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error: any) {
      console.error('FCM notification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send FCM notification',
      };
    }
  }

  // Send Web Push notification (for browsers)
  static async sendWebPushNotification(subscription: any, notification: PushNotificationData) {
    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/logo.png',
        badge: notification.badge || '/badge.png',
        data: notification.data || {},
        actions: notification.actions || [],
        timestamp: Date.now(),
      });

      const result = await webpush.sendNotification(subscription, payload);
      
      console.log('Web push notification sent successfully');
      return {
        success: true,
        statusCode: result.statusCode,
      };
    } catch (error: any) {
      console.error('Web push notification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send web push notification',
      };
    }
  }

  // Send booking confirmation notification
  static async sendBookingConfirmation(
    userTokens: { fcm?: string[], webPush?: any[] },
    bookingDetails: any
  ) {
    const notification: PushNotificationData = {
      title: '🎾 Booking Confirmed!',
      body: `Your ${bookingDetails.sport} booking is confirmed. Complete payment in 5 minutes.`,
      icon: '/sports-icon.png',
      data: {
        type: 'booking_confirmation',
        bookingId: bookingDetails.bookingId,
        sport: bookingDetails.sport,
        date: bookingDetails.date,
        amount: bookingDetails.totalAmount.toString(),
      },
      actions: [
        {
          action: 'pay_now',
          title: 'Pay Now',
          icon: '/pay-icon.png',
        },
        {
          action: 'view_booking',
          title: 'View Details',
          icon: '/view-icon.png',
        },
      ],
    };

    const results = [];

    // Send FCM notifications
    if (userTokens.fcm && userTokens.fcm.length > 0) {
      const fcmResult = await this.sendFCMNotification(userTokens.fcm, notification);
      results.push({ type: 'fcm', ...fcmResult });
    }

    // Send Web Push notifications
    if (userTokens.webPush && userTokens.webPush.length > 0) {
      for (const subscription of userTokens.webPush) {
        const webPushResult = await this.sendWebPushNotification(subscription, notification);
        results.push({ type: 'webpush', ...webPushResult });
      }
    }

    return results;
  }

  // Send payment reminder notification
  static async sendPaymentReminder(
    userTokens: { fcm?: string[], webPush?: any[] },
    bookingDetails: any,
    minutesLeft: number
  ) {
    const notification: PushNotificationData = {
      title: '⏰ Payment Reminder',
      body: `Only ${minutesLeft} minutes left to complete your booking payment!`,
      icon: '/reminder-icon.png',
      data: {
        type: 'payment_reminder',
        bookingId: bookingDetails.bookingId,
        minutesLeft: minutesLeft.toString(),
      },
      actions: [
        {
          action: 'pay_now',
          title: 'Pay Now',
          icon: '/pay-icon.png',
        },
      ],
    };

    return this.sendMultipleNotifications(userTokens, notification);
  }

  // Send payment success notification
  static async sendPaymentSuccess(
    userTokens: { fcm?: string[], webPush?: any[] },
    bookingDetails: any
  ) {
    const notification: PushNotificationData = {
      title: '✅ Payment Successful!',
      body: `Your ${bookingDetails.sport} booking is confirmed and paid. See you there!`,
      icon: '/success-icon.png',
      data: {
        type: 'payment_success',
        bookingId: bookingDetails.bookingId,
      },
      actions: [
        {
          action: 'view_booking',
          title: 'View Booking',
          icon: '/view-icon.png',
        },
      ],
    };

    return this.sendMultipleNotifications(userTokens, notification);
  }

  // Send booking cancellation notification
  static async sendBookingCancellation(
    userTokens: { fcm?: string[], webPush?: any[] },
    bookingId: string,
    reason: string
  ) {
    const notification: PushNotificationData = {
      title: '❌ Booking Cancelled',
      body: `Your booking has been cancelled: ${reason}`,
      icon: '/cancelled-icon.png',
      data: {
        type: 'booking_cancelled',
        bookingId,
        reason,
      },
      actions: [
        {
          action: 'book_again',
          title: 'Book Again',
          icon: '/book-icon.png',
        },
      ],
    };

    return this.sendMultipleNotifications(userTokens, notification);
  }

  // Helper method to send multiple notification types
  private static async sendMultipleNotifications(
    userTokens: { fcm?: string[], webPush?: any[] },
    notification: PushNotificationData
  ) {
    const results = [];

    if (userTokens.fcm && userTokens.fcm.length > 0) {
      const fcmResult = await this.sendFCMNotification(userTokens.fcm, notification);
      results.push({ type: 'fcm', ...fcmResult });
    }

    if (userTokens.webPush && userTokens.webPush.length > 0) {
      for (const subscription of userTokens.webPush) {
        const webPushResult = await this.sendWebPushNotification(subscription, notification);
        results.push({ type: 'webpush', ...webPushResult });
      }
    }

    return results;
  }
}
