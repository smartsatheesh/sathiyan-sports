# WhatsApp Booking Confirmation Integration

## 📋 Overview

This integration automatically sends WhatsApp notifications when bookings are confirmed in the Sathiyan Sports application. The system supports multiple WhatsApp methods with automatic fallback.

## 🚀 Features

- **Automatic booking confirmation notifications** via WhatsApp
- **Multiple WhatsApp methods** (Twilio, Meta Cloud API, URL generation, Console fallback)
- **Admin notifications** for new confirmed bookings
- **Manual booking confirmation** with WhatsApp notifications
- **Comprehensive testing tools** for WhatsApp integration

## 📁 Files Added/Modified

### API Endpoints

1. **`/src/app/api/bookings/[id]/payment-status/route.ts`**
   - Enhanced to send WhatsApp notifications on payment confirmation
   - Automatically triggered by payment webhooks

2. **`/src/app/api/bookings/[id]/confirm/route.ts`** (NEW)
   - Manual booking confirmation endpoint
   - Sends WhatsApp notifications to customer and admin
   - Used for manual payment verification

3. **`/src/app/api/test-whatsapp/route.ts`** (NEW)
   - Test endpoint for WhatsApp functionality
   - Supports OTP, booking, and admin notification testing

### Testing Tools

4. **`/public/whatsapp-booking-test.html`** (NEW)
   - Web interface for testing WhatsApp integration
   - Service status checker
   - Manual booking confirmation tool

## 🔧 Setup Instructions

### 1. Environment Variables

Add these variables to your `.env.local` file:

```env
# WhatsApp Method Selection
WHATSAPP_METHOD=twilio  # Options: 'cloud', 'twilio', 'url', 'simple'

# Twilio Configuration (if using Twilio method)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Twilio Sandbox number

# Meta WhatsApp Cloud API (if using cloud method)
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# GPay/UPI Configuration (for payment messages)
NEXT_PUBLIC_GPAY_UPI_ID=your-upi-id@bank
```

### 2. WhatsApp Method Selection

The system automatically selects the best available method:

1. **`cloud`** - Meta WhatsApp Cloud API (requires business verification)
2. **`twilio`** - Twilio WhatsApp API (easiest setup)
3. **`url`** - Generate WhatsApp URLs (no API required)
4. **`simple`** - Console logging (development/testing)

### 3. Twilio Setup (Recommended for Testing)

1. Create account at [Twilio Console](https://console.twilio.com/)
2. Go to **Programmable SMS** → **WhatsApp** → **Sandbox**
3. Get your sandbox number (e.g., `+1 415 523 8886`)
4. Join the sandbox by sending the join code from your phone
5. Add credentials to `.env.local`

## 📱 How It Works

### Automatic Notifications

When a payment is confirmed (via webhook), the system:

1. **Updates booking status** to `confirmed`
2. **Formats booking details** for WhatsApp message
3. **Sends customer notification** with booking details
4. **Sends admin notification** (optional)
5. **Logs all results** for debugging

### Message Format

**Customer Notification:**
```
🏸 *Booking Confirmed*

Hi [Customer Name]!

✅ Ref: [Booking Reference]
🏟️ Court: [Court Name]
📅 Date: [Date]
⏰ Time: [Time Slots]
💰 Amount: ₹[Amount]

Payment: [UPI ID]

Thank you! 🙏
```

**Admin Notification:**
```
🏸 *New Booking Confirmed*

📋 Ref: [Booking Reference]
👤 Customer: [Name] ([Phone])
🏟️ Court: [Court Name]
📅 Date: [Date]
⏰ Time: [Time Slots]
💰 Amount: ₹[Amount]

[Booking Details...]
```

## 🧪 Testing

### 1. Web Interface

Visit: `http://localhost:3000/whatsapp-booking-test.html`

- Check service status
- Test different message types
- Manual booking confirmation

### 2. API Testing

#### Check Status
```bash
curl http://localhost:3000/api/test-whatsapp
```

#### Test Booking Notification
```bash
curl -X POST http://localhost:3000/api/test-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "type": "booking"
  }'
```

#### Manual Booking Confirmation
```bash
curl -X POST http://localhost:3000/api/bookings/[BOOKING_ID]/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "adminConfirmation": true,
    "paymentMethod": "upi",
    "notes": "Manual confirmation"
  }'
```

## 🔍 Troubleshooting

### Common Issues

1. **"Twilio client not configured"**
   - Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env.local`
   - Restart the development server

2. **"Invalid 'To' number"**
   - Ensure phone number includes country code
   - For Twilio sandbox, recipient must join sandbox first

3. **"Invalid 'From' number"**
   - Check `TWILIO_WHATSAPP_FROM` format: `whatsapp:+14155238886`
   - Use provided Twilio sandbox number

4. **WhatsApp not sending**
   - Check service status via test page
   - Verify environment variables
   - Check server logs for detailed errors

### Debug Logs

The system provides detailed logging:

```javascript
console.log('📱 Sending WhatsApp booking confirmation:', {
  phone: customerPhone,
  reference: bookingReference
});
```

Look for these emojis in logs:
- 📱 WhatsApp operations
- ✅ Success messages
- ❌ Error messages
- ⚠️ Warning messages

## 🔄 Integration Points

### Existing Booking Flow

The WhatsApp integration hooks into:

1. **Payment Status Route** - Automatic on payment success
2. **Manual Confirmation** - Admin/manual verification
3. **Booking Model** - Uses existing booking data

### Booking Model Fields Used

```typescript
{
  bookingReference: string,     // Display in message
  customerName: string,        // Personalization
  customerPhone: string,       // WhatsApp recipient
  sport: string,              // Court/sport info
  court?: string,             // Specific court (Shuttle)
  date: Date,                 // Formatted date
  timeSlots: string[],        // Time ranges
  totalAmount: number         // Payment amount
}
```

## 🚀 Production Deployment

### Environment Setup

1. **Set production environment variables**
2. **Choose appropriate WhatsApp method**
3. **Configure webhook URLs** (for payment providers)
4. **Test all notification types**

### Security Considerations

- Store credentials securely
- Validate webhook signatures
- Rate limit WhatsApp API calls
- Log but don't expose sensitive data

### Monitoring

- Monitor WhatsApp API quotas
- Track message delivery rates
- Set up alerts for failed notifications
- Regular testing of all methods

## 📞 Support

### WhatsApp Service Status

Check real-time status at: `/whatsapp-booking-test.html`

### Logs Location

- Application logs: Server console
- WhatsApp API responses: Detailed in console
- Error tracking: Built into each service

### Manual Testing

Use the test interface to verify:
- [ ] Service configuration
- [ ] Message sending
- [ ] Phone number formatting
- [ ] Booking confirmation flow

---

**Note:** This integration is designed to be robust with multiple fallback options. If one method fails, the booking confirmation will still succeed, ensuring business continuity.
