import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Subscription from '../../../models/Subscription';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();

    // Simple count queries
    const totalUsers = await (User.countDocuments as any)({});
    const subscribedUsers = await (User.countDocuments as any)({ subscribed: 'yes' });
    const paidUsers = await (User.countDocuments as any)({ paymentStatus: 'completed' });
    const pendingUsers = await (User.countDocuments as any)({ paymentStatus: 'pending' });

    const totalSubscriptions = await (Subscription.countDocuments as any)({});
    const paidSubscriptions = await (Subscription.countDocuments as any)({ paymentStatus: 'Paid' });
    const pendingSubscriptions = await (Subscription.countDocuments as any)({ paymentStatus: 'Pending' });
    const overdueSubscriptions = await (Subscription.countDocuments as any)({ 
      paymentStatus: { $ne: 'Paid' }, 
      nextDueDate: { $lt: new Date() } 
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        users: {
          total: totalUsers,
          subscribed: subscribedUsers,
          paid: paidUsers,
          pending: pendingUsers
        },
        subscriptions: {
          total: totalSubscriptions,
          paid: paidSubscriptions,
          pending: pendingSubscriptions,
          overdue: overdueSubscriptions
        },
        discrepancy: subscribedUsers - totalSubscriptions
      }
    });

  } catch (error) {
    console.error('❌ Simple count error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}