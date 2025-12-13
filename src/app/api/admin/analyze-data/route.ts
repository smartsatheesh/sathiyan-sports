import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Subscription from '../../../models/Subscription';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();

    console.log('📊 Starting detailed data analysis...');

    // Get detailed user data
    const allUsers = await (User.find as any)({})
      .select('_id name email champId paymentStatus subscribed createdAt');

    const subscribedUsers = allUsers.filter(user => user.subscribed === 'yes');
    const paidUsers = allUsers.filter(user => user.paymentStatus === 'completed');

    // Get detailed subscription data
    const allSubscriptions = await (Subscription.find as any)({})
      .select('userId userName userEmail paymentStatus status nextDueDate createdAt')
      .populate('userId', 'name email');

    // Categorize subscriptions
    const paidSubscriptions = allSubscriptions.filter(sub => sub.paymentStatus === 'Paid');
    const pendingSubscriptions = allSubscriptions.filter(sub => sub.paymentStatus === 'Pending');
    const overdueSubscriptions = allSubscriptions.filter(sub => {
      const today = new Date();
      return sub.paymentStatus !== 'Paid' && sub.nextDueDate < today;
    });

    // Find mismatches
    const usersWithoutSubscriptions = subscribedUsers.filter(user => 
      !allSubscriptions.some(sub => sub.userId?.toString() === user._id.toString())
    );

    const subscriptionsWithoutUsers = allSubscriptions.filter(sub => 
      !subscribedUsers.some(user => user._id.toString() === sub.userId?.toString())
    );

    const paymentStatusMismatches = [];
    subscribedUsers.forEach(user => {
      const subscription = allSubscriptions.find(sub => 
        sub.userId?.toString() === user._id.toString()
      );
      if (subscription) {
        if ((user.paymentStatus === 'completed' && subscription.paymentStatus !== 'Paid') ||
            (user.paymentStatus === 'pending' && subscription.paymentStatus === 'Paid')) {
          paymentStatusMismatches.push({
            name: user.name,
            email: user.email,
            userPaymentStatus: user.paymentStatus,
            subscriptionPaymentStatus: subscription.paymentStatus
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers: allUsers.length,
        subscribedUsers: subscribedUsers.length,
        paidUsers: paidUsers.length,
        totalSubscriptions: allSubscriptions.length,
        paidSubscriptions: paidSubscriptions.length,
        pendingSubscriptions: pendingSubscriptions.length,
        overdueSubscriptions: overdueSubscriptions.length
      },
      mismatches: {
        usersWithoutSubscriptions: usersWithoutSubscriptions.map(u => ({
          name: u.name,
          email: u.email,
          paymentStatus: u.paymentStatus
        })),
        subscriptionsWithoutUsers: subscriptionsWithoutUsers.map(s => ({
          userName: s.userName,
          userEmail: s.userEmail,
          paymentStatus: s.paymentStatus,
          hasValidUser: !!s.userId
        })),
        paymentStatusMismatches
      },
      overdueDetails: overdueSubscriptions.map(sub => ({
        userName: sub.userName,
        userEmail: sub.userEmail,
        paymentStatus: sub.paymentStatus,
        nextDueDate: sub.nextDueDate,
        daysOverdue: Math.floor((new Date().getTime() - new Date(sub.nextDueDate).getTime()) / (1000 * 60 * 60 * 24))
      }))
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}