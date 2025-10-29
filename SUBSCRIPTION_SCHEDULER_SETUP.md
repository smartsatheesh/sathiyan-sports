# Subscription Notification Scheduler Setup

This document explains how to set up automated subscription reminder notifications for the "Pay for your health" feature.

## Overview

The subscription notification system sends automated reminders:
- **2 days before** subscription due date
- **On the due date** 
- **2 days after** due date (overdue notification)

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployment)

1. Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/subscription/notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

2. Set environment variables in Vercel:
```bash
CRON_SECRET=your-secure-random-string
NEXT_PUBLIC_BASE_URL=https://your-domain.com
SUPPORT_EMAIL=support@your-domain.com
SUPPORT_PHONE=+91-XXXXXXXXXX
```

### Option 2: GitHub Actions (Free alternative)

1. Create `.github/workflows/subscription-notifications.yml`:

```yaml
name: Subscription Notifications

on:
  schedule:
    # Run daily at 9:00 AM IST (3:30 AM UTC)
    - cron: '30 3 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Send Subscription Notifications
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            ${{ secrets.APP_URL }}/api/subscription/notifications
```

2. Set GitHub secrets:
- `CRON_SECRET`: Same as your environment variable
- `APP_URL`: Your application URL

### Option 3: External Cron Services

Use services like:
- **Cron-job.org** (Free)
- **EasyCron** 
- **Zapier** (Scheduled Zaps)

Set up a daily HTTP POST request to:
```
POST https://your-domain.com/api/subscription/notifications
Authorization: Bearer YOUR_CRON_SECRET
```

### Option 4: Self-hosted Cron (Linux/Unix servers)

Add to your server's crontab:
```bash
# Edit crontab
crontab -e

# Add this line to run daily at 9:00 AM
0 9 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/subscription/notifications
```

## Environment Variables

Add these to your `.env.local` file:

```bash
# Notification Security
CRON_SECRET=your-secure-random-string-here

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# In production: NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Support Contact Information
SUPPORT_EMAIL=support@sathiyansports.com
SUPPORT_PHONE=+91-XXXXXXXXXX

# WhatsApp API (when integrated)
WHATSAPP_TOKEN=your-whatsapp-api-token
WHATSAPP_PHONE_ID=your-whatsapp-phone-id

# Email Service (when integrated)
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@sathiyansports.com
```

## Testing

### Manual Testing
```bash
# Test the notification system
curl -X GET "https://your-domain.com/api/subscription/notifications?test=true"
```

### Admin Testing
1. Go to `/admin/subscriptions`
2. Create test subscriptions with due dates
3. Trigger notifications manually for testing

## Notification Integration

### WhatsApp Integration
To integrate with WhatsApp Business API:

1. Set up WhatsApp Business API account
2. Get API credentials
3. Update `SubscriptionNotificationService.sendWhatsAppNotification()` method
4. Add proper error handling and delivery confirmation

### Email Integration
To integrate with email service (SendGrid example):

1. Install SendGrid:
```bash
npm install @sendgrid/mail
```

2. Update `SubscriptionNotificationService.sendEmailNotification()` method:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const msg = {
  to: data.userEmail,
  from: process.env.FROM_EMAIL!,
  subject: subject,
  html: htmlContent,
};

await sgMail.send(msg);
```

## Monitoring

### Logs
The notification system logs all activities:
- Check Vercel Function logs
- Monitor notification delivery rates
- Track failed notifications

### Admin Dashboard
- View notification statistics in admin panel
- Monitor subscription renewal rates
- Track overdue subscriptions

## Troubleshooting

### Common Issues

1. **Notifications not sending**
   - Check CRON_SECRET is set correctly
   - Verify cron job is configured
   - Check application logs

2. **Wrong timezone**
   - Adjust cron schedule for your timezone
   - IST = UTC + 5:30

3. **Database connection issues**
   - Ensure MongoDB connection is stable
   - Check connection string and credentials

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG_NOTIFICATIONS=true
```

## Security

- Use a strong, unique CRON_SECRET
- Restrict API access to authorized sources only
- Implement rate limiting for notification endpoints
- Monitor for suspicious activity

## Best Practices

1. **Timing**: Send notifications at appropriate times (9 AM IST recommended)
2. **Content**: Keep messages clear and actionable
3. **Frequency**: Don't spam users with too many notifications
4. **Opt-out**: Provide unsubscribe options (future enhancement)
5. **Monitoring**: Track delivery rates and user engagement

## Future Enhancements

- SMS notifications
- Push notifications
- Custom notification preferences per user
- A/B testing for notification content
- Notification analytics and reporting