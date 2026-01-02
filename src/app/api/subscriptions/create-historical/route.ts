import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Subscription from '@/app/models/Subscription';
import User from '@/app/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const body = await request.json();
    console.log('📝 Creating historical subscription:', body);

    // Create historical subscription record directly
    const historicalSubscription = await (Subscription as any).create({
      // Find or create user if needed
      userId: body.userId || '690420c1e66e344374a58dd7', // Use existing user ID or create new
      champId: body.champId,
      userName: body.userName,
      userEmail: body.userEmail,
      userMobile: body.userMobile,
      subscriptionType: body.subscriptionType,
      mode: body.mode,
      amount: body.amount,
      duration: body.duration,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      nextDueDate: new Date(body.nextDueDate),
      paymentStatus: body.paymentStatus,
      status: body.status,
      paymentMethod: body.paymentMethod,
      transactionId: body.transactionId,
      lastPaymentDate: body.lastPaymentDate ? new Date(body.lastPaymentDate) : undefined,
      preferredSport: body.preferredSport,
      preferredTimeSlot: body.preferredTimeSlot,
      selectedCourt: body.selectedCourt,
      notes: body.notes,
      autoRenewal: body.autoRenewal,
      
      // Historical tracking fields
      subscriptionPeriodId: body.subscriptionPeriodId,
      isRenewal: body.isRenewal || false,
      renewalNumber: body.renewalNumber || 1,
      previousSubscriptionId: body.previousSubscriptionId,
      
      // Notifications
      notificationsSent: body.notificationsSent,
      
      // Admin fields (use admin user ID if available)
      createdBy: body.createdBy|| '60a0f4b8e1234567890abcde',
      createdAt: body.startDate ? new Date(body.startDate) : new Date(),
      updatedBy: body.userId,
      updatedAt: new Date()
    });

    console.log('✅ Historical subscription created:', historicalSubscription._id);

    return NextResponse.json({ 
      success: true, 
      subscription: historicalSubscription,
      message: `Historical subscription for ${body.userName} (${body.champId}) created successfully`
    });

  } catch (error) {
    console.error('❌ Error creating historical subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create historical subscription: ' + error.message },
      { status: 500 }
    );
  }
}