import { NextRequest, NextResponse } from "next/server";
import PaymentNotificationService from "@/app/services/PaymentNotificationService";
import BillingCycleService from "@/app/services/BillingCycleService";

// GET - Get notification statistics
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'stats') {
      const stats = await PaymentNotificationService.getNotificationStats();
      return NextResponse.json({
        success: true,
        stats
      });
    } else if (action === 'upcoming') {
      const daysAhead = parseInt(url.searchParams.get('days') || '7');
      const users = await BillingCycleService.getUsersWithUpcomingDueDates(daysAhead);
      return NextResponse.json({
        success: true,
        users,
        count: users.length
      });
    } else if (action === 'overdue') {
      const users = await BillingCycleService.getOverdueUsers();
      return NextResponse.json({
        success: true,
        users,
        count: users.length
      });
    } else {
      return NextResponse.json(
        { message: "Invalid action. Use 'stats', 'upcoming', or 'overdue'", success: false },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error fetching notification data:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to fetch notification data", 
        success: false 
      },
      { status: 500 }
    );
  }
}

// POST - Send notifications
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, daysAhead, testEmail, testMobile, testName } = body;

    if (type === 'upcoming') {
      const days = daysAhead || 7;
      const result = await PaymentNotificationService.sendUpcomingPaymentReminders(days);
      
      return NextResponse.json({
        success: true,
        message: `Upcoming payment reminders sent successfully`,
        result
      });

    } else if (type === 'overdue') {
      const result = await PaymentNotificationService.sendOverduePaymentNotifications();
      
      return NextResponse.json({
        success: true,
        message: `Overdue payment notifications sent successfully`,
        result
      });

    } else if (type === 'test') {
      if (!testEmail || !testMobile) {
        return NextResponse.json(
          { message: "Test email and mobile are required for test notifications", success: false },
          { status: 400 }
        );
      }

      const result = await PaymentNotificationService.sendTestNotification(
        testEmail, 
        testMobile, 
        testName || 'Test User'
      );
      
      return NextResponse.json({
        success: true,
        message: result ? 'Test notification sent successfully' : 'Failed to send test notification',
        result: { sent: result }
      });

    } else {
      return NextResponse.json(
        { message: "Invalid type. Use 'upcoming', 'overdue', or 'test'", success: false },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error sending notifications:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to send notifications", 
        success: false 
      },
      { status: 500 }
    );
  }
}