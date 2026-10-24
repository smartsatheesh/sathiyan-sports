# Notification Services Setup Guide

This guide will help you set up SMS, Push Notifications, and WhatsApp Business API for your Sathiyan Sports booking application.

## 🚀 Quick Start

1. **Copy environment variables:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your API credentials** (see setup sections below)

3. **Test notifications:**
   ```bash
   # Test all services
   curl -X POST http://localhost:3000/api/test-notifications \
     -H "Content-Type: application/json" \
     -d '{"testType": "all", "user": {"name": "Test User", "phone": "+919876543210"}}'
   ```

## 📱 1. SMS Service Setup (Twilio)

### Step 1: Create Twilio Account
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account
3. Verify your phone number

### Step 2: Get Credentials
1. From Twilio Console Dashboard:
   - **Account SID** → Copy to `TWILIO_ACCOUNT_SID`
   - **Auth Token** → Copy to `TWILIO_AUTH_TOKEN`

### Step 3: Get Phone Number
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number with SMS capability
3. Copy number to `TWILIO_PHONE_NUMBER` (format: +1234567890)

### Step 4: Configure Webhook (Optional)
1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click your number
3. Set **Webhook URL**: `https://yourdomain.com/api/webhooks/sms`
4. Set **HTTP Method**: POST

### Environment Variables:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## 🔔 2. Push Notifications Setup (Firebase)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Create a project**
3. Enable **Cloud Messaging**

### Step 2: Generate Service Account Key
1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file

### Step 3: Get Credentials from JSON
```json
{
  "project_id": "your-project-id",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

### Step 4: Generate VAPID Keys (for Web Push)
1. Go to **Project Settings** → **Cloud Messaging**
2. In **Web configuration**, click **Generate key pair**
3. Copy the key pair

### Environment Variables:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
VAPID_EMAIL=your-email@example.com
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## 💬 3. WhatsApp Business API Setup

### Step 1: Meta Business Account
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a **Business Account**
3. Create a new **App** → **Business**

### Step 2: Add WhatsApp Business Product
1. In your app dashboard, click **Add Product**
2. Select **WhatsApp Business API**
3. Click **Set up**

### Step 3: Get Credentials
1. **Access Token**: 
   - Go to **WhatsApp** → **API Setup**
   - Copy the temporary access token
   - For production, generate a permanent token

2. **Phone Number ID**:
   - From the same API Setup page
   - Copy the Phone Number ID

3. **Verify Token**:
   - Create a random string for webhook verification
   - Example: `myapp_webhook_verify_token_123`

### Step 4: Configure Webhook
1. Go to **WhatsApp** → **Configuration**
2. Click **Edit** next to Webhook
3. Set **Callback URL**: `https://yourdomain.com/api/webhooks/whatsapp`
4. Set **Verify Token**: Your chosen verify token
5. Subscribe to **messages** field

### Environment Variables:
```env
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=myapp_webhook_verify_token_123
```

## 🧪 Testing the Services

### Test Individual Services

**SMS Test:**
```bash
curl -X POST http://localhost:3000/api/test-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "booking_confirmation",
    "user": {
      "name": "John Doe",
      "phone": "+919876543210",
      "preferences": {"sms": true, "push": false, "whatsapp": false}
    }
  }'
```

**WhatsApp Test:**
```bash
curl -X POST http://localhost:3000/api/test-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "payment_reminder",
    "user": {
      "name": "Jane Smith",
      "phone": "+919876543211",
      "preferences": {"sms": false, "push": false, "whatsapp": true}
    }
  }'
```

**All Services Test:**
```bash
curl -X POST http://localhost:3000/api/test-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "all",
    "user": {
      "name": "Test User",
      "phone": "+919876543212",
      "preferences": {"sms": true, "push": true, "whatsapp": true}
    }
  }'
```

## 🔧 Integration with Booking Flow

The notification services are automatically integrated with your booking system:

### Automatic Notifications:
1. **Booking Confirmation** → Sent when booking is created
2. **Payment Reminder** → Sent 2 minutes before expiry
3. **Payment Success** → Sent when payment is confirmed
4. **Booking Cancellation** → Sent when payment expires

### Webhook Handlers:
- **SMS Status**: `/api/webhooks/sms`
- **WhatsApp Messages**: `/api/webhooks/whatsapp`

## 📊 Monitoring and Logs

### Check Logs:
```bash
# View application logs
npm run dev

# Check specific service logs
console.log('SMS result:', smsResult);
console.log('WhatsApp result:', whatsappResult);
console.log('Push notification result:', pushResult);
```

### Test API Endpoint:
Visit: `http://localhost:3000/api/test-notifications` (GET request) for API documentation.

## 🚨 Troubleshooting

### Common Issues:

1. **SMS not sending:**
   - Check Twilio credentials
   - Verify phone number format (+country_code)
   - Check Twilio account balance

2. **WhatsApp not working:**
   - Verify webhook URL is publicly accessible
   - Check access token validity
   - Ensure phone number is verified with Meta

3. **Push notifications not working:**
   - Check Firebase service account key
   - Verify VAPID keys are correct
   - Ensure user has granted notification permission

### Error Codes:
- `SMS service not configured` → Missing Twilio credentials
- `WhatsApp API not configured` → Missing Meta credentials
- `Firebase not configured` → Missing Firebase credentials

## 🔐 Security Notes

1. **Never commit API keys to version control**
2. **Use environment variables for all credentials**
3. **Verify webhook sources** using provided verification methods
4. **Rate limit your notification endpoints**
5. **Log notification attempts** for debugging

## 💰 Cost Estimates

### Twilio SMS:
- **India**: ₹0.50 - ₹2.00 per SMS
- **International**: $0.0075 - $0.20 per SMS

### WhatsApp Business API:
- **Template messages**: $0.005 - $0.09 per message
- **Session messages**: Free for 24 hours after user message

### Firebase Push Notifications:
- **Free tier**: Up to 10M messages/month
- **Paid**: $0.50 per 1M additional messages

## 🎯 Best Practices

1. **User Preferences**: Allow users to choose notification channels
2. **Fallback Strategy**: SMS as backup if WhatsApp fails
3. **Rate Limiting**: Avoid spamming users
4. **Personalization**: Use customer names in messages
5. **Timing**: Send notifications at appropriate times
6. **Tracking**: Monitor delivery rates and failures

## 📞 Support

For issues with specific services:
- **Twilio**: [Twilio Support](https://support.twilio.com/)
- **Firebase**: [Firebase Support](https://support.google.com/firebase/)
- **WhatsApp Business**: [Meta Business Support](https://business.facebook.com/business/help/)

For application-specific issues, check the console logs and API responses.
