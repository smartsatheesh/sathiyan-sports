// Test Notifications API Route
import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/app/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { testType, user } = await request.json();

    // Default test user data
    const testUser = {
      name: user?.name || 'Test User',
      phone: user?.phone || '+919876543210',
      email: user?.email || 'test@example.com',
      fcmTokens: user?.fcmTokens || [],
      webPushSubscriptions: user?.webPushSubscriptions || [],
      preferences: {
        sms: user?.preferences?.sms ?? true,
        push: user?.preferences?.push ?? true,
        whatsapp: user?.preferences?.whatsapp ?? true,
      },
    };

    const testBooking = {
      bookingId: 'TEST_' + Date.now(),
      sport: 'Cricket',
      date: new Date().toLocaleDateString('en-GB'),
      timeSlots: ['10:00 AM - 11:00 AM'],
      totalAmount: 699,
    };

    let result;

    switch (testType) {
      case 'booking_confirmation':
        result = await NotificationService.sendBookingConfirmation(testUser, testBooking);
        break;
        
      case 'payment_reminder':
        result = await NotificationService.sendPaymentReminder(testUser, testBooking, 2);
        break;
        
      case 'payment_success':
        result = await NotificationService.sendPaymentSuccess(testUser, testBooking);
        break;
        
      case 'booking_cancellation':
        result = await NotificationService.sendBookingCancellation(
          testUser,
          testBooking.bookingId,
          'Payment timeout'
        );
        break;
        
      case 'all':
        // Test all notification types
        const allResults = [];
        
        // Booking confirmation
        const confirmationResult = await NotificationService.sendBookingConfirmation(testUser, testBooking);
        allResults.push({ type: 'booking_confirmation', ...confirmationResult });
        
        // Wait 2 seconds between notifications
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Payment reminder
        const reminderResult = await NotificationService.sendPaymentReminder(testUser, testBooking, 2);
        allResults.push({ type: 'payment_reminder', ...reminderResult });
        
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Payment success
        const successResult = await NotificationService.sendPaymentSuccess(testUser, testBooking);
        allResults.push({ type: 'payment_success', ...successResult });
        
        result = {
          success: true,
          message: 'All test notifications sent',
          results: allResults,
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: booking_confirmation, payment_reminder, payment_success, booking_cancellation, or all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      testType,
      user: testUser,
      booking: testBooking,
      result,
    });

  } catch (error: any) {
    console.error('Error testing notifications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test notifications', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Notification Test API',
    usage: {
      method: 'POST',
      body: {
        testType: 'booking_confirmation | payment_reminder | payment_success | booking_cancellation | all',
        user: {
          name: 'Test User',
          phone: '+919876543210',
          email: 'test@example.com',
          preferences: {
            sms: true,
            push: true,
            whatsapp: true,
          }
        }
      }
    },
    examples: [
      {
        description: 'Test booking confirmation',
        body: {
          testType: 'booking_confirmation',
          user: {
            name: 'John Doe',
            phone: '+919876543210',
            preferences: { sms: true, whatsapp: true, push: false }
          }
        }
      },
      {
        description: 'Test all notifications',
        body: {
          testType: 'all',
          user: {
            name: 'Jane Smith',
            phone: '+919876543211'
          }
        }
      }
    ]
  });
}
