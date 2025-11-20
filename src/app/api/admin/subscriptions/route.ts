import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authConfig';
import Subscription from '@/app/models/Subscription';
import { connectToMongoose } from '@/app/server/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can access this endpoint
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all subscriptions with populated user data
    const subscriptions = await (Subscription.find as any)({})
      .populate('userId', 'name email champId phone mobile gender preferredTimeSlot champType preferredSport selectedCourt')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ nextDueDate: 1, createdAt: -1 }); // Sort by next due date first, then by creation date

    // Calculate overdue status for each subscription
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscriptionsWithStatus = subscriptions.map((sub: any) => {
      const subscription = sub.toObject();
      
      // Calculate overdue status
      if (subscription.paymentStatus !== 'Paid' && subscription.nextDueDate) {
        const dueDate = new Date(subscription.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        subscription.isOverdue = diffDays > 0;
        subscription.daysPastDue = Math.max(diffDays, 0);
        
        // Grace period can be user-specific or default to 7 days
        const gracePeriod = subscription.gracePeriod || 7;
        subscription.isPastGrace = diffDays > gracePeriod;
        subscription.gracePeriod = gracePeriod;
      } else {
        subscription.isOverdue = false;
        subscription.daysPastDue = 0;
        subscription.isPastGrace = false;
        subscription.gracePeriod = subscription.gracePeriod || 7;
      }

      return subscription;
    });

    return NextResponse.json({ 
      success: true, 
      subscriptions: subscriptionsWithStatus 
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch subscriptions', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}