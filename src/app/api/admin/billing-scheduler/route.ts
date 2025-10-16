import { NextRequest, NextResponse } from 'next/server';
import { billingSchedulerService } from '../../../services/billingSchedulerService';

// GET - Get scheduler status
export async function GET() {
  try {
    const status = billingSchedulerService.getStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Manual operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userEmail } = body;

    let result;

    switch (action) {
      case 'trigger_reminders':
        result = await billingSchedulerService.manualTriggerReminders();
        break;
        
      case 'trigger_overdue':
        result = await billingSchedulerService.manualTriggerOverdue();
        break;
        
      case 'test_notification':
        if (!userEmail) {
          return NextResponse.json({
            success: false,
            message: 'Email is required for test notification'
          }, { status: 400 });
        }
        result = await billingSchedulerService.sendTestNotification(userEmail);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Available actions: trigger_reminders, trigger_overdue, test_notification'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in scheduler operation:', error);
    return NextResponse.json({
      success: false,
      message: 'Scheduler operation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}