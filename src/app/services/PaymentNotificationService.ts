import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";
import BillingCycleService from "./BillingCycleService";

// Types for notification configuration
export interface NotificationConfig {
  type: 'email' | 'whatsapp' | 'sms';
  enabled: boolean;
}

export interface NotificationData {
  userId: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  subscriptionType: string;
  subscriptionAmount: number;
  nextDueDate: Date;
  overdueDays?: number;
  paymentStatus: string;
}

export class PaymentNotificationService {
  // Template messages
  private static readonly TEMPLATES = {
    UPCOMING_PAYMENT_EMAIL: {
      subject: 'Payment Reminder - Sathiyan Sports',
      body: `
        Dear {userName},
        
        This is a friendly reminder that your {subscriptionType} subscription payment of ₹{amount} is due on {dueDate}.
        
        Payment Details:
        - Subscription: {subscriptionType} (₹{amount})
        - Due Date: {dueDate}
        - Days Remaining: {daysRemaining}
        
        Please make your payment before the due date to continue enjoying our services.
        
        Payment Methods:
        - GPay: [UPI ID]
        - PhonePe: [UPI ID]
        - Cash at facility
        - Bank Transfer: [Account Details]
        
        Thank you for choosing Sathiyan Sports!
        
        Best regards,
        Sathiyan Sports Team
      `
    },
    
    OVERDUE_PAYMENT_EMAIL: {
      subject: 'URGENT: Overdue Payment - Sathiyan Sports',
      body: `
        Dear {userName},
        
        Your {subscriptionType} subscription payment of ₹{amount} is now {overdueDays} days overdue.
        
        Payment Details:
        - Subscription: {subscriptionType} (₹{amount})
        - Original Due Date: {dueDate}
        - Days Overdue: {overdueDays}
        
        Please make your payment immediately to avoid service suspension.
        
        Payment Methods:
        - GPay: [UPI ID]
        - PhonePe: [UPI ID]
        - Cash at facility
        - Bank Transfer: [Account Details]
        
        Contact us if you have any questions or need assistance.
        
        Best regards,
        Sathiyan Sports Team
      `
    },
    
    UPCOMING_PAYMENT_WHATSAPP: `
🏸 *Sathiyan Sports Payment Reminder*

Hi {userName}! 👋

Your {subscriptionType} payment of *₹{amount}* is due on *{dueDate}* ({daysRemaining} days remaining).

💳 *Payment Options:*
• GPay/PhonePe: [UPI ID]
• Cash at facility
• Bank transfer

Please pay before due date to continue services.

Questions? Reply to this message! 📱
    `,
    
    OVERDUE_PAYMENT_WHATSAPP: `
🚨 *URGENT: Overdue Payment - Sathiyan Sports*

Hi {userName},

Your {subscriptionType} payment of *₹{amount}* is *{overdueDays} days overdue*.

⚠️ Please pay immediately to avoid service suspension.

💳 *Quick Payment:*
• GPay/PhonePe: [UPI ID]
• Contact: [Phone Number]

Pay now to continue your membership! 🏸
    `
  };

  /**
   * Replace template placeholders with actual data
   */
  private static replaceTemplate(template: string, data: NotificationData, daysRemaining?: number): string {
    const dueDate = new Date(data.nextDueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return template
      .replace(/{userName}/g, data.userName)
      .replace(/{subscriptionType}/g, data.subscriptionType)
      .replace(/{amount}/g, data.subscriptionAmount.toString())
      .replace(/{dueDate}/g, dueDate)
      .replace(/{daysRemaining}/g, daysRemaining?.toString() || '0')
      .replace(/{overdueDays}/g, data.overdueDays?.toString() || '0');
  }

  /**
   * Send email notification (placeholder - integrate with your email service)
   */
  private static async sendEmail(
    to: string, 
    subject: string, 
    body: string
  ): Promise<boolean> {
    try {
      // TODO: Integrate with your email service (nodemailer, sendgrid, etc.)
      console.log(`📧 Email would be sent to: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send WhatsApp notification (placeholder - integrate with WhatsApp API)
   */
  private static async sendWhatsApp(
    phoneNumber: string, 
    message: string
  ): Promise<boolean> {
    try {
      // TODO: Integrate with WhatsApp Business API
      console.log(`📱 WhatsApp would be sent to: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      
      // Simulate WhatsApp sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send upcoming payment reminders
   */
  static async sendUpcomingPaymentReminders(daysAhead: number = 7): Promise<{
    sent: number;
    failed: number;
    details: Array<{ userId: string; userName: string; status: 'sent' | 'failed'; channels: string[] }>
  }> {
    await connectToMongoose();
    
    const users = await BillingCycleService.getUsersWithUpcomingDueDates(daysAhead);
    const results = { sent: 0, failed: 0, details: [] as any[] };

    for (const user of users) {
      const daysRemaining = Math.ceil(
        (new Date(user.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const notificationData: NotificationData = {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        userMobile: user.mobile,
        subscriptionType: user.subscriptionType,
        subscriptionAmount: user.subscriptionAmount,
        nextDueDate: new Date(user.nextDueDate),
        paymentStatus: user.paymentStatus
      };

      const channels: string[] = [];
      let success = false;

      try {
        // Send email notification
        if (user.email) {
          const emailSubject = this.TEMPLATES.UPCOMING_PAYMENT_EMAIL.subject;
          const emailBody = this.replaceTemplate(
            this.TEMPLATES.UPCOMING_PAYMENT_EMAIL.body, 
            notificationData, 
            daysRemaining
          );
          
          const emailSent = await this.sendEmail(user.email, emailSubject, emailBody);
          if (emailSent) {
            channels.push('email');
            success = true;
          }
        }

        // Send WhatsApp notification
        if (user.mobile) {
          const whatsappMessage = this.replaceTemplate(
            this.TEMPLATES.UPCOMING_PAYMENT_WHATSAPP, 
            notificationData, 
            daysRemaining
          );
          
          const whatsappSent = await this.sendWhatsApp(user.mobile, whatsappMessage);
          if (whatsappSent) {
            channels.push('whatsapp');
            success = true;
          }
        }

        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }

        results.details.push({
          userId: user._id.toString(),
          userName: user.name,
          status: success ? 'sent' : 'failed',
          channels
        });

      } catch (error) {
        console.error(`Failed to send notifications to user ${user.name}:`, error);
        results.failed++;
        results.details.push({
          userId: user._id.toString(),
          userName: user.name,
          status: 'failed',
          channels: []
        });
      }
    }

    return results;
  }

  /**
   * Send overdue payment notifications
   */
  static async sendOverduePaymentNotifications(): Promise<{
    sent: number;
    failed: number;
    details: Array<{ userId: string; userName: string; status: 'sent' | 'failed'; channels: string[] }>
  }> {
    await connectToMongoose();
    
    const users = await BillingCycleService.getOverdueUsers();
    const results = { sent: 0, failed: 0, details: [] as any[] };

    for (const user of users) {
      const notificationData: NotificationData = {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        userMobile: user.mobile,
        subscriptionType: user.subscriptionType,
        subscriptionAmount: user.subscriptionAmount,
        nextDueDate: new Date(user.nextDueDate),
        overdueDays: user.overdueDays,
        paymentStatus: user.paymentStatus
      };

      const channels: string[] = [];
      let success = false;

      try {
        // Send email notification
        if (user.email) {
          const emailSubject = this.TEMPLATES.OVERDUE_PAYMENT_EMAIL.subject;
          const emailBody = this.replaceTemplate(
            this.TEMPLATES.OVERDUE_PAYMENT_EMAIL.body, 
            notificationData
          );
          
          const emailSent = await this.sendEmail(user.email, emailSubject, emailBody);
          if (emailSent) {
            channels.push('email');
            success = true;
          }
        }

        // Send WhatsApp notification
        if (user.mobile) {
          const whatsappMessage = this.replaceTemplate(
            this.TEMPLATES.OVERDUE_PAYMENT_WHATSAPP, 
            notificationData
          );
          
          const whatsappSent = await this.sendWhatsApp(user.mobile, whatsappMessage);
          if (whatsappSent) {
            channels.push('whatsapp');
            success = true;
          }
        }

        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }

        results.details.push({
          userId: user._id.toString(),
          userName: user.name,
          status: success ? 'sent' : 'failed',
          channels
        });

      } catch (error) {
        console.error(`Failed to send overdue notifications to user ${user.name}:`, error);
        results.failed++;
        results.details.push({
          userId: user._id.toString(),
          userName: user.name,
          status: 'failed',
          channels: []
        });
      }
    }

    return results;
  }

  /**
   * Send test notification to verify service is working
   */
  static async sendTestNotification(
    userEmail: string, 
    userMobile: string, 
    userName: string = 'Test User'
  ): Promise<boolean> {
    const testData: NotificationData = {
      userId: 'test',
      userName,
      userEmail,
      userMobile,
      subscriptionType: 'monthly',
      subscriptionAmount: 1000,
      nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      paymentStatus: 'registered'
    };

    try {
      const emailSubject = 'Test Notification - Sathiyan Sports';
      const emailBody = this.replaceTemplate(
        this.TEMPLATES.UPCOMING_PAYMENT_EMAIL.body, 
        testData, 
        7
      );
      
      const whatsappMessage = this.replaceTemplate(
        this.TEMPLATES.UPCOMING_PAYMENT_WHATSAPP, 
        testData, 
        7
      );

      const emailSent = await this.sendEmail(userEmail, emailSubject, emailBody);
      const whatsappSent = await this.sendWhatsApp(userMobile, whatsappMessage);

      return emailSent || whatsappSent;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<{
    upcomingDue: number;
    overdue: number;
    lastUpdated: Date;
  }> {
    await connectToMongoose();
    
    const upcomingUsers = await BillingCycleService.getUsersWithUpcomingDueDates(7);
    const overdueUsers = await BillingCycleService.getOverdueUsers();

    return {
      upcomingDue: upcomingUsers.length,
      overdue: overdueUsers.length,
      lastUpdated: new Date()
    };
  }
}

export default PaymentNotificationService;