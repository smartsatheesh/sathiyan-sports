import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionNotificationService } from '../../../services/SubscriptionNotificationService';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is coming from a cron job or authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting subscription notification job...');
    
    await SubscriptionNotificationService.sendSubscriptionReminders();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subscription notifications sent successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in subscription notification job:', error);
    return NextResponse.json({ 
      error: 'Failed to send notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Allow GET for testing purposes (remove in production)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test');
    
    if (testMode === 'true') {
      console.log('Running subscription notifications in test mode...');
      await SubscriptionNotificationService.sendSubscriptionReminders();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test notifications completed',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ 
      message: 'Subscription notification endpoint',
      usage: 'POST /api/subscription/notifications or GET /api/subscription/notifications?test=true'
    });
    
  } catch (error) {
    console.error('Error in test notification job:', error);
    return NextResponse.json({ 
      error: 'Failed to send test notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}