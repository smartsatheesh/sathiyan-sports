import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/authConfig';
import Subscription from '../../../models/Subscription';
import { connectToMongoose } from '../../../server/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await (Subscription.findById as any)(params.id)
      .populate('userId', 'name email champId')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check if user can access this subscription
    if (session.user.role !== 'admin' && subscription.userId._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentStatus, paymentMethod, transactionId, autoRenewal } = body;

    const subscription = await (Subscription.findById as any)(params.id);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check if user can update this subscription
    if (session.user.role !== 'admin' && subscription.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update subscription
    if (paymentStatus) subscription.paymentStatus = paymentStatus;
    if (paymentMethod) subscription.paymentMethod = paymentMethod;
    if (transactionId) subscription.transactionId = transactionId;
    if (typeof autoRenewal !== 'undefined') subscription.autoRenewal = autoRenewal;
    
    // If payment is successful, set payment date
    if (paymentStatus === 'Paid') {
      subscription.lastPaymentDate = new Date();
      
      // If auto-renewal is enabled and this was a renewal, update dates
      if (subscription.autoRenewal && subscription.paymentStatus === 'Overdue') {
        await subscription.renewSubscription();
      }
    }

    subscription.updatedBy = session.user.id;
    await subscription.save();

    // Populate and return updated subscription
    await subscription.populate('userId', 'name email champId');
    await subscription.populate('createdBy', 'name email');
    await subscription.populate('updatedBy', 'name email');

    return NextResponse.json({ 
      subscription,
      message: 'Subscription updated successfully' 
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const subscription = await (Subscription.findByIdAndDelete as any)(params.id);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}