import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Subscription from '@/app/models/Subscription';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all subscriptions
    const allSubs = await (Subscription.find as any)({})
      .select('userName nextDueDate status paymentStatus subscriptionType amount')
      .sort({ nextDueDate: -1 });
    
    console.log(`🔍 Total subscriptions: ${allSubs.length}`);
    console.log(`📅 Today: ${today.toDateString()}`);
    
    // Group by status
    const byStatus = {};
    const byPaymentStatus = {};
    
    allSubs.forEach(sub => {
      const status = sub.status || 'undefined';
      const paymentStatus = sub.paymentStatus || 'undefined';
      
      byStatus[status] = (byStatus[status] || 0) + 1;
      byPaymentStatus[paymentStatus] = (byPaymentStatus[paymentStatus] || 0) + 1;
    });
    
    // Check overdue logic
    const potentialOverdue = allSubs.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    
    // Apply new overdue logic (simplified - past due date + active)
    const overdueByNewLogic = allSubs.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const isPastDue = today > dueDate;
      const isActive = (sub.status === 'active' || !sub.status) && 
                      sub.status !== 'expired' && 
                      sub.status !== 'cancelled';
      
      return isPastDue && isActive;
    });
    
    // Check for January 2026 renewals needed
    const jan2026 = new Date(2026, 0, 1); // January 1, 2026
    const jan2026End = new Date(2026, 1, 1); // February 1, 2026
    
    const needingJan2026Renewal = allSubs.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      return dueDate >= jan2026 && dueDate < jan2026End && 
             (sub.status === 'active' || !sub.status) &&
             (sub.paymentStatus === 'Pending' || sub.paymentStatus === 'pending');
    });
    
    const result = {
      timestamp: new Date().toISOString(),
      today: today.toDateString(),
      totalSubscriptions: allSubs.length,
      byStatus,
      byPaymentStatus,
      overdue: {
        withPastDueDate: potentialOverdue.length,
        byNewLogic: overdueByNewLogic.length,
        needingJan2026Renewal: needingJan2026Renewal.length
      },
      samples: {
        pastDue: potentialOverdue.slice(0, 3).map(sub => ({
          userName: sub.userName,
          nextDueDate: new Date(sub.nextDueDate).toDateString(),
          status: sub.status,
          paymentStatus: sub.paymentStatus,
          subscriptionType: sub.subscriptionType,
          amount: sub.amount,
          daysPast: Math.ceil((today.getTime() - new Date(sub.nextDueDate).getTime()) / (1000 * 60 * 60 * 24))
        })),
        overdue: overdueByNewLogic.slice(0, 5).map(sub => ({
          userName: sub.userName,
          nextDueDate: new Date(sub.nextDueDate).toDateString(),
          status: sub.status,
          paymentStatus: sub.paymentStatus,
          subscriptionType: sub.subscriptionType,
          amount: sub.amount,
          daysPast: Math.ceil((today.getTime() - new Date(sub.nextDueDate).getTime()) / (1000 * 60 * 60 * 24))
        })),
        jan2026Renewals: needingJan2026Renewal.slice(0, 5).map(sub => ({
          userName: sub.userName,
          nextDueDate: new Date(sub.nextDueDate).toDateString(),
          status: sub.status,
          paymentStatus: sub.paymentStatus,
          subscriptionType: sub.subscriptionType,
          amount: sub.amount
        }))
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}