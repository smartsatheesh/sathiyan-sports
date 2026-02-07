import Subscription from '../models/Subscription';
import { connectToMongoose } from '../server/mongodb';

interface NotificationData {
  userId: string;
  subscriptionId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  subscriptionType: string;
  amount: number;
  dueDate: Date;
  daysUntilDue: number;
  type: 'two_days_before' | 'on_due_date' | 'two_days_after';
}

export class SubscriptionNotificationService {
  
  /**
   * Send WhatsApp notification for subscription reminder
   */
  static async sendWhatsAppNotification(data: NotificationData): Promise<boolean> {
    try {
      const message = this.generateWhatsAppMessage(data);
      
      // Here you would integrate with your WhatsApp API
      // For now, we'll log the message and return true
      console.log('WhatsApp Notification:', {
        phone: data.userPhone,
        message: message,
        subscriptionId: data.subscriptionId
      });
      
      // TODO: Integrate with actual WhatsApp API
      // Example:
      // const response = await fetch('https://api.whatsapp.com/send', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
      //   body: JSON.stringify({
      //     to: data.userPhone,
      //     message: message
      //   })
      // });
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      return false;
    }
  }

  /**
   * Send email notification for subscription reminder
   */
  static async sendEmailNotification(data: NotificationData): Promise<boolean> {
    try {
      const subject = this.generateEmailSubject(data);
      const htmlContent = this.generateEmailContent(data);
      
      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      console.log('Email Notification:', {
        to: data.userEmail,
        subject: subject,
        html: htmlContent,
        subscriptionId: data.subscriptionId
      });
      
      // TODO: Integrate with actual email service
      // Example with SendGrid:
      // const msg = {
      //   to: data.userEmail,
      //   from: process.env.FROM_EMAIL,
      //   subject: subject,
      //   html: htmlContent,
      // };
      // await sgMail.send(msg);
      
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  /**
   * Find and send subscription reminder notifications
   */
  static async sendSubscriptionReminders(): Promise<void> {
    try {
      await connectToMongoose();
      
      const today = new Date();
      const twoDaysLater = new Date(today);
      twoDaysLater.setDate(today.getDate() + 2);
      
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      // Find subscriptions due in 2 days (reminder before due date)
      const subscriptionsDueSoon = await (Subscription.find as any)({
        nextDueDate: {
          $gte: new Date(twoDaysLater.setHours(0, 0, 0, 0)),
          $lte: new Date(twoDaysLater.setHours(23, 59, 59, 999))
        },
        paymentStatus: { $in: ['Paid', 'Pending'] },
        'notificationsSent.twoDaysBefore': false
      }).populate('userId', 'name email phone');

      // Find subscriptions due today
      const subscriptionsDueToday = await (Subscription.find as any)({
        nextDueDate: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999))
        },
        paymentStatus: { $in: ['Paid', 'Pending'] },
        'notificationsSent.onDueDate': false
      }).populate('userId', 'name email phone');

      // Find subscriptions overdue by 2 days
      const subscriptionsOverdue = await (Subscription.find as any)({
        nextDueDate: {
          $gte: new Date(twoDaysAgo.setHours(0, 0, 0, 0)),
          $lte: new Date(twoDaysAgo.setHours(23, 59, 59, 999))
        },
        paymentStatus: { $ne: 'Paid' },
        'notificationsSent.twoDaysAfter': false
      }).populate('userId', 'name email phone');

      // Process two days before notifications
      for (const subscription of subscriptionsDueSoon) {
        const notificationData: NotificationData = {
          userId: subscription.userId._id.toString(),
          subscriptionId: subscription._id.toString(),
          userName: subscription.userId.name,
          userEmail: subscription.userId.email,
          userPhone: subscription.userId.phone,
          subscriptionType: subscription.subscriptionType,
          amount: subscription.amount,
          dueDate: subscription.nextDueDate,
          daysUntilDue: 2,
          type: 'two_days_before'
        };

        const whatsappSent = await this.sendWhatsAppNotification(notificationData);
        const emailSent = await this.sendEmailNotification(notificationData);

        if (whatsappSent || emailSent) {
          subscription.notificationsSent.twoDaysBefore = true;
          await subscription.save();
        }
      }

      // Process due date notifications
      for (const subscription of subscriptionsDueToday) {
        const notificationData: NotificationData = {
          userId: subscription.userId._id.toString(),
          subscriptionId: subscription._id.toString(),
          userName: subscription.userId.name,
          userEmail: subscription.userId.email,
          userPhone: subscription.userId.phone,
          subscriptionType: subscription.subscriptionType,
          amount: subscription.amount,
          dueDate: subscription.nextDueDate,
          daysUntilDue: 0,
          type: 'on_due_date'
        };

        const whatsappSent = await this.sendWhatsAppNotification(notificationData);
        const emailSent = await this.sendEmailNotification(notificationData);

        if (whatsappSent || emailSent) {
          subscription.notificationsSent.onDueDate = true;
          await subscription.save();
        }
      }

      // Process overdue notifications
      for (const subscription of subscriptionsOverdue) {
        const notificationData: NotificationData = {
          userId: subscription.userId._id.toString(),
          subscriptionId: subscription._id.toString(),
          userName: subscription.userId.name,
          userEmail: subscription.userId.email,
          userPhone: subscription.userId.phone,
          subscriptionType: subscription.subscriptionType,
          amount: subscription.amount,
          dueDate: subscription.nextDueDate,
          daysUntilDue: -2,
          type: 'two_days_after'
        };

        const whatsappSent = await this.sendWhatsAppNotification(notificationData);
        const emailSent = await this.sendEmailNotification(notificationData);

        if (whatsappSent || emailSent) {
          subscription.notificationsSent.twoDaysAfter = true;
          subscription.paymentStatus = 'Overdue';
          await subscription.save();
        }
      }

      console.log(`Notification Summary:
        - Two days before notifications: ${subscriptionsDueSoon.length}
        - Due date notifications: ${subscriptionsDueToday.length}
        - Overdue notifications: ${subscriptionsOverdue.length}`);

    } catch (error) {
      console.error('Error sending subscription reminders:', error);
    }
  }

  /**
   * Generate WhatsApp message content
   */
  private static generateWhatsAppMessage(data: NotificationData): string {
    const { userName, subscriptionType, amount, dueDate, type } = data;
    const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
    const formattedDate = dueDate.toLocaleDateString('en-GB');

    switch (type) {
      case 'two_days_before':
        return `🏥 *Health Subscription Reminder*

Hi ${userName}!

Your ${subscriptionType} health plan is due for renewal in 2 days.

💰 *Amount:* ${formattedAmount}
📅 *Due Date:* ${formattedDate}

Renew now to continue enjoying uninterrupted health services:
${process.env.NEXT_PUBLIC_BASE_URL}/subscription

Thank you for prioritizing your health! 🌟`;

      case 'on_due_date':
        return `🏥 *Health Subscription Due Today*

Hi ${userName}!

Your ${subscriptionType} health plan expires today.

💰 *Amount:* ${formattedAmount}
📅 *Due Date:* ${formattedDate}

⚠️ Renew immediately to avoid service interruption:
${process.env.NEXT_PUBLIC_BASE_URL}/subscription

Stay healthy with us! 💪`;

      case 'two_days_after':
        return `🏥 *Health Subscription Overdue*

Hi ${userName}!

Your ${subscriptionType} health plan expired 2 days ago.

💰 *Amount:* ${formattedAmount}
📅 *Due Date:* ${formattedDate}

❌ Your health services are now suspended. Renew now to restore access:
${process.env.NEXT_PUBLIC_BASE_URL}/subscription

Contact us if you need assistance: ${process.env.SUPPORT_PHONE || '+91-XXXXXXXXXX'}`;

      default:
        return `Health subscription reminder for ${userName}`;
    }
  }

  /**
   * Generate email subject
   */
  private static generateEmailSubject(data: NotificationData): string {
    const { subscriptionType, type } = data;

    switch (type) {
      case 'two_days_before':
        return `🏥 Your ${subscriptionType} Health Plan Renewal Reminder`;
      case 'on_due_date':
        return `⚠️ Your ${subscriptionType} Health Plan Expires Today`;
      case 'two_days_after':
        return `❌ Your ${subscriptionType} Health Plan is Overdue`;
      default:
        return 'Health Subscription Reminder';
    }
  }

  /**
   * Generate email HTML content
   */
  private static generateEmailContent(data: NotificationData): string {
    const { userName, subscriptionType, amount, dueDate, type } = data;
    const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
    const formattedDate = dueDate.toLocaleDateString('en-GB');
    const renewalUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/subscription`;

    const baseStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .urgent { background: #ff5722; }
        .overdue { background: #f44336; }
      </style>
    `;

    let content = '';
    let buttonClass = '';
    let statusIcon = '';

    switch (type) {
      case 'two_days_before':
        statusIcon = '🔔';
        buttonClass = '';
        content = `
          <p>Your ${subscriptionType} health plan is due for renewal in <strong>2 days</strong>.</p>
          <p>Don't let your health services expire! Renew now to continue enjoying:</p>
          <ul>
            <li>Continuous health monitoring</li>
            <li>Personalized fitness guidance</li>
            <li>Priority support</li>
            <li>Exclusive health tips via WhatsApp</li>
          </ul>
        `;
        break;

      case 'on_due_date':
        statusIcon = '⚠️';
        buttonClass = 'urgent';
        content = `
          <p><strong>Your ${subscriptionType} health plan expires today!</strong></p>
          <p>To avoid any interruption in your health services, please renew immediately.</p>
          <p>Don't compromise on your health journey - renew now!</p>
        `;
        break;

      case 'two_days_after':
        statusIcon = '❌';
        buttonClass = 'overdue';
        content = `
          <p><strong>Your ${subscriptionType} health plan expired 2 days ago.</strong></p>
          <p>Your health services are currently suspended. To restore access to:</p>
          <ul>
            <li>Health monitoring</li>
            <li>Fitness guidance</li>
            <li>Support services</li>
          </ul>
          <p>Please renew your subscription immediately.</p>
          <p>Need help? Contact our support team at ${process.env.SUPPORT_EMAIL || 'support@sathiyansports.com'}</p>
        `;
        break;
    }

    return `
      ${baseStyles}
      <div class="container">
        <div class="header">
          <h1>${statusIcon} Health Subscription ${type === 'two_days_before' ? 'Reminder' : type === 'on_due_date' ? 'Due Today' : 'Overdue'}</h1>
        </div>
        <div class="content">
          <h2>Hi ${userName}!</h2>
          
          ${content}
          
          <div class="highlight">
            <p><strong>Subscription Details:</strong></p>
            <p>Plan: ${subscriptionType}<br>
            Amount: ${formattedAmount}<br>
            Due Date: ${formattedDate}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${renewalUrl}" class="button ${buttonClass}">
              Renew Now
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated reminder from Sathiyan Sports Health Services.<br>
            If you have already renewed, please ignore this message.
          </p>
        </div>
      </div>
    `;
  }
}