import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
        console.log('📧 Email service not configured. Would send email:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text || html}`);
        return true; // Return true for development
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Sathiyan Sports</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #5a6fd8; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏏 Sathiyan Sports</h1>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="content">
            <p>Hello ${name},</p>
            
            <p>We received a request to reset your password for your Sathiyan Sports account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <a href="${resetUrl}" class="button">Reset My Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons. If you need to reset your password after this time, please request a new reset link.
            </div>
            
            <p>If you're having trouble with the button above, you can also reset your password by visiting our login page and clicking "Forgot Password".</p>
            
            <p>Best regards,<br>The Sathiyan Sports Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${email} because a password reset was requested for your account.</p>
            <p>© ${new Date().getFullYear()} Sathiyan Sports. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request - Sathiyan Sports
      
      Hello ${name},
      
      We received a request to reset your password for your Sathiyan Sports account. If you didn't make this request, you can safely ignore this email.
      
      To reset your password, visit this link: ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      Best regards,
      The Sathiyan Sports Team
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Sathiyan Sports Password',
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Sathiyan Sports</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏏 Welcome to Sathiyan Sports!</h1>
          </div>
          
          <div class="content">
            <p>Hello ${name},</p>
            
            <p>Welcome to Sathiyan Sports! We're excited to have you join our community of sports enthusiasts.</p>
            
            <p>With your account, you can:</p>
            <ul>
              <li>🏟️ Book sports venues and courts</li>
              <li>📅 Manage your bookings</li>
              <li>👤 Update your profile</li>
              <li>🎯 Track your booking history</li>
            </ul>
            
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" class="button">Start Booking Now</a>
            
            <p>If you have any questions or need help getting started, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The Sathiyan Sports Team</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Sathiyan Sports. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Sathiyan Sports! 🏏',
      html,
    });
  }
}

export default new EmailService();
