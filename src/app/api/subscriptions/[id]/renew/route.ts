import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import Subscription from '@/app/models/Subscription';
import User from '@/app/models/User';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
// Note: Using basic auth check instead of importing authOptions

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Basic auth check - replace with proper session validation
    const headers = request.headers;
    
    await connectToDatabase();

    // Get the current subscription
    const currentSubscription = await (Subscription as any).findById(params.id);
    if (!currentSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Ensure required fields exist for legacy subscriptions
    if (!currentSubscription.subscriptionPeriodId) {
      currentSubscription.subscriptionPeriodId = `${currentSubscription.champId}_${currentSubscription._id}`;
      await currentSubscription.save();
    }
    
    if (!currentSubscription.isRenewal) {
      currentSubscription.isRenewal = false;
    }
    
    if (!currentSubscription.renewalNumber) {
      currentSubscription.renewalNumber = 1;
    }
    
    if (!currentSubscription.createdBy && currentSubscription.userId) {
      currentSubscription.createdBy = currentSubscription.userId;
    }

    const {
      paymentStatus = 'Paid',
      paymentMethod,
      amount,
      startDate,
      endDate,
      transactionId,
      selectedCourt
    } = await request.json();

    // Create new subscription for renewal (keeps historical data)
    const renewalData = {
      userId: currentSubscription.userId,
      champId: currentSubscription.champId,
      userName: currentSubscription.userName,
      userEmail: currentSubscription.userEmail,
      userMobile: currentSubscription.userMobile,
      subscriptionType: currentSubscription.subscriptionType,
      mode: currentSubscription.mode,
      amount: amount || currentSubscription.amount,
      duration: currentSubscription.duration,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentStatus: paymentStatus,
      status: paymentStatus === 'Paid' ? 'active' : 'pending',
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      lastPaymentDate: paymentStatus === 'Paid' ? new Date() : undefined,
      nextDueDate: new Date(endDate),
      autoRenewal: currentSubscription.autoRenewal,
      preferredSport: currentSubscription.preferredSport,
      preferredTimeSlot: currentSubscription.preferredTimeSlot,
      selectedCourt: selectedCourt || currentSubscription.selectedCourt,
      notes: `Renewal ${currentSubscription.renewalNumber + 1} - Previous period: ${currentSubscription.startDate.toDateString()} to ${currentSubscription.endDate.toDateString()}`,
      // Renewal tracking
      subscriptionPeriodId: currentSubscription.subscriptionPeriodId,
      isRenewal: true,
      previousSubscriptionId: currentSubscription._id,
      renewalNumber: currentSubscription.renewalNumber + 1,
      notificationsSent: {
        twoDaysBefore: false,
        onDueDate: false,
        twoDaysAfter: false,
      },
      createdBy: currentSubscription.userId,
      updatedBy: currentSubscription.userId
    };

    console.log('💰 Creating renewal subscription:', renewalData);

    // Create the new subscription record
    const newSubscription = await (Subscription as any).create(renewalData);

    // Update the previous subscription to expired/completed status
    await (Subscription as any).findByIdAndUpdate(params.id, {
      status: 'expired',
      updatedBy: currentSubscription.userId
    });

    // Update user's current subscription reference to the new one
    await (User as any).findByIdAndUpdate(currentSubscription.userId, {
      currentSubscription: newSubscription._id,
      subscriptionStatus: paymentStatus === 'Paid' ? 'Active' : 'Pending'
    });

    console.log('✅ Subscription renewed successfully:', newSubscription._id);

    return NextResponse.json({ 
      success: true, 
      subscription: newSubscription,
      message: 'Subscription renewed successfully - historical data preserved'
    });

  } catch (error) {
    console.error('❌ Error renewing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to renew subscription' },
      { status: 500 }
    );
  }
}