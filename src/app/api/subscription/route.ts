import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/authConfig';
import Subscription from '../../models/Subscription';
import { connectToMongoose } from '../../server/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Admin can view all subscriptions, users can only view their own
    const query = session.user.role === 'admin' && userId 
      ? { userId } 
      : { userId: session.user.id };

    const subscriptions = await (Subscription.find as any)(query)
      .populate('userId', 'name email champId')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionType, duration, autoRenewal } = body;

    // Get subscription plans
    const plans = (Subscription as any).getSubscriptionPlans();
    const selectedPlan = plans[subscriptionType as keyof typeof plans];

    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid subscription type' }, { status: 400 });
    }

    // Check if user already has an active subscription
    const existingSubscription = await (Subscription.findOne as any)({
      userId: session.user.id,
      paymentStatus: { $in: ['Paid', 'Pending'] },
      endDate: { $gte: new Date() }
    });

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'You already have an active or pending subscription' 
      }, { status: 400 });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (duration || selectedPlan.duration));

    const subscription = new Subscription({
      userId: session.user.id,
      subscriptionType,
      amount: selectedPlan.amount,
      duration: duration || selectedPlan.duration,
      startDate,
      endDate,
      nextDueDate: endDate,
      autoRenewal: autoRenewal || false,
      paymentStatus: 'Pending',
      createdBy: session.user.id
    });

    await subscription.save();

    // Populate the created subscription
    await subscription.populate('userId', 'name email champId');
    await subscription.populate('createdBy', 'name email');

    return NextResponse.json({ 
      subscription,
      message: 'Subscription created successfully. Please proceed with payment.' 
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

// Get subscription plans
export async function OPTIONS() {
  try {
    const plans = (Subscription as any).getSubscriptionPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription plans' }, { status: 500 });
  }
}