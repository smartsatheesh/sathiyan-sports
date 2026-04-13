import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/authConfig';
// Adjust the import path if the file is located elsewhere, for example:
import { SubscriptionNotificationService } from '../../../services/SubscriptionNotificationService';
// Or, if the file does not exist, create it at the correct location with a valid export.

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || (session.user.role !== 'admin' && session.user.role !== 'coach')) {
      return NextResponse.json({ error: 'Admin or Coach access required' }, { status: 403 });
    }

    console.log('Admin triggered subscription notifications test...');
    
    await SubscriptionNotificationService.sendSubscriptionReminders();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test notifications sent successfully',
      timestamp: new Date().toISOString(),
      triggeredBy: session.user.name
    });
    
  } catch (error) {
    console.error('Error in admin notification test:', error);
    return NextResponse.json({ 
      error: 'Failed to send test notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}