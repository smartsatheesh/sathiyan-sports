import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Subscription from '@/app/models/Subscription';
import User from '@/app/models/User';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToMongoose();
    
    const subscriptionId = params.id;
    const body = await request.json();
    
    const { 
      paymentStatus, 
      status, 
      paymentMethod, 
      transactionId, 
      notes,
      updatedBy,
      amount,
      mode,
      autoRenewal,
      selectedCourt,
      startDate,
      endDate
    } = body;

    console.log('🔧 Updating subscription with data:', body);

    const subscription = await (Subscription.findById as any)(subscriptionId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (paymentStatus) subscription.paymentStatus = paymentStatus;
    if (status) subscription.status = status;
    if (paymentMethod) subscription.paymentMethod = paymentMethod;
    if (transactionId) subscription.transactionId = transactionId;
    if (notes) subscription.notes = notes;
    if (updatedBy) subscription.updatedBy = updatedBy;
    
    // Update additional fields
    if (amount !== undefined && amount !== null) subscription.amount = Number(amount);
    if (mode) subscription.mode = mode;
    if (autoRenewal !== undefined) subscription.autoRenewal = autoRenewal;
    if (selectedCourt) subscription.selectedCourt = selectedCourt;
    if (startDate) subscription.startDate = new Date(startDate);
    if (endDate) subscription.endDate = new Date(endDate);

    // If payment is confirmed, update payment date
    if (paymentStatus === 'Paid' && !subscription.lastPaymentDate) {
      subscription.lastPaymentDate = new Date();
    }

    await subscription.save();

    // Update user subscription status if needed
    if (status === 'active' && paymentStatus === 'Paid') {
      await (User.findByIdAndUpdate as any)(subscription.userId, {
        hasActiveSubscription: true,
        lastSubscriptionDate: subscription.lastPaymentDate
      });
    } else if (status === 'expired' || status === 'cancelled') {
      await (User.findByIdAndUpdate as any)(subscription.userId, {
        hasActiveSubscription: false
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToMongoose();
    
    const subscriptionId = params.id;

    const subscription = await (Subscription.findByIdAndDelete as any)(subscriptionId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Update user subscription status
    await (User.findByIdAndUpdate as any)(subscription.userId, {
      hasActiveSubscription: false
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}