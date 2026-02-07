import nodemailer from 'nodemailer';
import { IBillingCycle, BillingReminder } from '../models/BillingCycle';
import whatsAppCloudService from './WhatsAppCloudService';

interface BillingNotificationOptions {
  type: 'email' | 'whatsapp' | 'sms';
  recipient: string;
  subject?: string;
  message: string;
  templateData?: any;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class BillingNotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send billing reminder notification
   */
  async sendBillingReminder(
    billingCycle: IBillingCycle,
    reminder: BillingReminder,
    daysUntilBilling: number
  ): Promise<boolean> {
    const notificationPromises: Promise<boolean>[] = [];

    // Prepare message content
    const messageData = {
      userName: billingCycle.userName,
      amount: billingCycle.currentAmount,
      currency: billingCycle.currency,
      nextBillingDate: new Date(billingCycle.nextBillingDate).toLocaleDateString('en-GB'),
      daysUntilBilling,
      cycleType: billingCycle.cycleType,
      planName: `${billingCycle.cycleType.charAt(0).toUpperCase() + billingCycle.cycleType.slice(1)} Plan`
    };

    // Send email if enabled
    if (billingCycle.notificationPreferences.email) {
      notificationPromises.push(this.sendEmail(billingCycle.userEmail, messageData, daysUntilBilling));
    }

    // Send WhatsApp if enabled
    if (billingCycle.notificationPreferences.whatsapp) {
      // Extract phone number from email or use a phone field if available
      const phoneNumber = billingCycle.userEmail; // Assuming phone is stored, adjust as needed
      notificationPromises.push(this.sendWhatsApp(phoneNumber, messageData));
    }

    // Send SMS if enabled
    if (billingCycle.notificationPreferences.sms) {
      const phoneNumber = billingCycle.userEmail; // Assuming phone is stored, adjust as needed
      notificationPromises.push(this.sendSMS(phoneNumber, messageData));
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);
    
    // Return true if at least one notification was sent successfully
    return results.some(result => result.status === 'fulfilled' && result.value === true);
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    email: string, 
    data: any, 
    daysUntilBilling: number
  ): Promise<boolean> {
    try {
      const template = this.getEmailTemplate(daysUntilBilling, data);
      
      const mailOptions = {
        from: `"Sathiyan Sports" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      console.log('Billing email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send billing email:', error);
      return false;
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsApp(phoneNumber: string, data: any): Promise<boolean> {
    try {
      const message = this.getWhatsAppMessage(data);
      
      // Use existing WhatsApp service
      const result = await whatsAppCloudService.sendBillingReminder(phoneNumber, data);
      
      console.log('WhatsApp billing reminder sent:', result);
      return result;
    } catch (error) {
      console.error('Failed to send WhatsApp billing reminder:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(phoneNumber: string, data: any): Promise<boolean> {
    try {
      // This is a placeholder for SMS integration
      // You would integrate with Twilio, AWS SNS, or other SMS providers
      
      const message = this.getSMSMessage(data);
      
      // Example with Twilio SMS (requires setup)
      /*
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require('twilio')(accountSid, authToken);
      
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      */

      console.log('SMS billing reminder would be sent:', message);
      return true;
    } catch (error) {
      console.error('Failed to send SMS billing reminder:', error);
      return false;
    }
  }

  /**
   * Get email template based on days until billing
   */
  private getEmailTemplate(daysUntilBilling: number, data: any): EmailTemplate {
    const isOverdue = daysUntilBilling < 0;
    const isToday = daysUntilBilling === 0;
    
    let subject: string;
    let urgencyColor: string;
    let urgencyText: string;

    if (isOverdue) {
      subject = `🚨 URGENT: Overdue Payment - ${data.planName}`;
      urgencyColor = '#f44336';
      urgencyText = `Your payment is ${Math.abs(daysUntilBilling)} days overdue`;
    } else if (isToday) {
      subject = `💳 Payment Due Today - ${data.planName}`;
      urgencyColor = '#ff9800';
      urgencyText = 'Your payment is due today';
    } else if (daysUntilBilling <= 3) {
      subject = `⏰ Payment Reminder - ${data.planName} (${daysUntilBilling} days)`;
      urgencyColor = '#ff9800';
      urgencyText = `Your payment is due in ${daysUntilBilling} days`;
    } else {
      subject = `📅 Upcoming Payment - ${data.planName} (${daysUntilBilling} days)`;
      urgencyColor = '#2196f3';
      urgencyText = `Your payment is due in ${daysUntilBilling} days`;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Billing Reminder - Sathiyan Sports</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🏸 Sathiyan Sports</h1>
                <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Your Badminton Journey Continues</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background-color: ${urgencyColor}; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">
                        ${urgencyText}
                    </div>
                </div>
                
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.userName}! 👋</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    ${isOverdue 
                        ? 'We noticed your payment is overdue. To continue enjoying our services without interruption, please make your payment as soon as possible.'
                        : isToday
                        ? 'Your subscription payment is due today. Please make your payment to continue enjoying uninterrupted access to our services.'
                        : 'This is a friendly reminder that your subscription payment is coming up soon.'
                    }
                </p>
                
                <!-- Payment Details Card -->
                <div style="background-color: #f8f9fa; border-left: 4px solid ${urgencyColor}; padding: 25px; border-radius: 6px; margin: 30px 0;">
                    <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">💳 Payment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Plan:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.planName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Amount:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: bold; font-size: 18px;">${data.currency} ${data.amount.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Due Date:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.nextBillingDate}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                        💳 Make Payment
                    </a>
                </div>
                
                <!-- Support Section -->
                <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin-top: 30px;">
                    <h4 style="color: #1976d2; margin: 0 0 10px 0;">Need Help? 🤝</h4>
                    <p style="color: #666; margin: 0; line-height: 1.5;">
                        If you have any questions about your payment or need assistance, please don't hesitate to contact our support team.
                    </p>
                    <p style="color: #666; margin: 10px 0 0 0;">
                        📧 Email: support@sathiyansports.com<br>
                        📱 Phone: +91 98765 43210
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #333; padding: 25px; text-align: center;">
                <p style="color: #999; margin: 0; font-size: 14px;">
                    © 2024 Sathiyan Sports. All rights reserved.
                </p>
                <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">
                    You received this email because you have an active subscription with us.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Sathiyan Sports - Billing Reminder

Hello ${data.userName},

${urgencyText}

Payment Details:
- Plan: ${data.planName}
- Amount: ${data.currency} ${data.amount.toLocaleString()}
- Due Date: ${data.nextBillingDate}

${isOverdue 
  ? 'Your payment is overdue. Please make your payment immediately to avoid service interruption.'
  : isToday
  ? 'Your payment is due today. Please make your payment to continue enjoying our services.'
  : 'Please make your payment by the due date to continue enjoying uninterrupted access to our services.'
}

Make your payment: ${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings

Need help? Contact us:
Email: support@sathiyansports.com
Phone: +91 98765 43210

© 2024 Sathiyan Sports. All rights reserved.
`;

    return { subject, html, text };
  }

  /**
   * Get WhatsApp message template
   */
  private getWhatsAppMessage(data: any): string {
    return `🏸 *Sathiyan Sports* - Payment Reminder

Hello ${data.userName}! 👋

Your ${data.planName} payment is due soon.

💳 *Payment Details:*
• Amount: ${data.currency} ${data.amount.toLocaleString()}
• Due Date: ${data.nextBillingDate}

Click here to make payment: ${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings

Need help? Reply to this message or call +91 98765 43210

Thank you for choosing Sathiyan Sports! 🙏`;
  }

  /**
   * Get SMS message template
   */
  private getSMSMessage(data: any): string {
    return `Sathiyan Sports: Payment reminder for ${data.userName}. ${data.planName} - ${data.currency} ${data.amount} due on ${data.nextBillingDate}. Pay now: ${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings`;
  }

  /**
   * Send overdue payment alert
   */
  async sendOverdueAlert(billingCycle: IBillingCycle): Promise<boolean> {
    const daysOverdue = Math.abs(
      Math.floor((Date.now() - new Date(billingCycle.nextBillingDate).getTime()) / (1000 * 60 * 60 * 24))
    );

    return this.sendBillingReminder(
      billingCycle,
      {
        userId: billingCycle.userId,
        billingCycleId: billingCycle.userId, // Using userId as fallback for ID
        userEmail: billingCycle.userEmail,
        userName: billingCycle.userName,
        reminderType: 'overdue_payment',
        scheduledDate: new Date(),
        daysUntilBilling: -daysOverdue,
        amount: billingCycle.currentAmount,
        cycleType: billingCycle.cycleType,
        status: 'pending',
        sentVia: [],
        message: `Payment overdue by ${daysOverdue} days`,
        createdAt: new Date(),
        attempts: 0
      },
      -daysOverdue
    );
  }

  /**
   * Send successful payment confirmation
   */
  async sendPaymentConfirmation(
    billingCycle: IBillingCycle,
    paymentAmount: number,
    transactionId: string
  ): Promise<boolean> {
    try {
      if (!billingCycle.notificationPreferences.email) {
        return false;
      }

      const template = this.getPaymentConfirmationTemplate(billingCycle, paymentAmount, transactionId);
      
      const mailOptions = {
        from: `"Sathiyan Sports" <${process.env.SMTP_USER}>`,
        to: billingCycle.userEmail,
        subject: template.subject,
        text: template.text,
        html: template.html
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      console.log('Payment confirmation sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      return false;
    }
  }

  /**
   * Get payment confirmation email template
   */
  private getPaymentConfirmationTemplate(
    billingCycle: IBillingCycle,
    paymentAmount: number,
    transactionId: string
  ): EmailTemplate {
    const subject = `✅ Payment Confirmed - ${billingCycle.cycleType.charAt(0).toUpperCase() + billingCycle.cycleType.slice(1)} Plan`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation - Sathiyan Sports</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🏸 Sathiyan Sports</h1>
                <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Payment Successful!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px; text-align: center;">
                <div style="background-color: #4caf50; color: white; padding: 15px 30px; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 18px; margin-bottom: 30px;">
                    ✅ Payment Confirmed
                </div>
                
                <h2 style="color: #333; margin-bottom: 20px;">Thank you, ${billingCycle.userName}! 🙏</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Your payment has been successfully processed. Your subscription is now active and you can continue enjoying our services.
                </p>
                
                <!-- Payment Details -->
                <div style="background-color: #f8f9fa; border-left: 4px solid #4caf50; padding: 25px; border-radius: 6px; margin: 30px 0; text-align: left;">
                    <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">💳 Payment Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Transaction ID:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: bold;">${transactionId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Amount Paid:</td>
                            <td style="padding: 8px 0; color: #4caf50; font-weight: bold; font-size: 18px;">${billingCycle.currency} ${paymentAmount.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Plan:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: bold;">${billingCycle.cycleType.charAt(0).toUpperCase() + billingCycle.cycleType.slice(1)} Plan</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666; font-weight: 500;">Next Billing:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: bold;">${new Date(billingCycle.nextBillingDate).toLocaleDateString('en-GB')}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin: 35px 0;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block;">
                        📱 View My Account
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #333; padding: 25px; text-align: center;">
                <p style="color: #999; margin: 0; font-size: 14px;">
                    © 2024 Sathiyan Sports. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Sathiyan Sports - Payment Confirmation

Thank you, ${billingCycle.userName}!

Your payment has been successfully processed.

Payment Summary:
- Transaction ID: ${transactionId}
- Amount Paid: ${billingCycle.currency} ${paymentAmount.toLocaleString()}
- Plan: ${billingCycle.cycleType.charAt(0).toUpperCase() + billingCycle.cycleType.slice(1)} Plan
- Next Billing: ${new Date(billingCycle.nextBillingDate).toLocaleDateString('en-GB')}

View your account: ${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings

© 2024 Sathiyan Sports. All rights reserved.
`;

    return { subject, html, text };
  }
}

export const billingNotificationService = new BillingNotificationService();