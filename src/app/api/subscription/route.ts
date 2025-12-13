import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/authConfig';
import Subscription from '../../models/Subscription';
import { connectToMongoose } from '../../server/mongodb';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Subscription API called');
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    console.log('🔐 Session user:', session?.user?.email, 'Role:', session?.user?.role);
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isAdmin = session.user.role === 'admin';
    
    console.log('🔑 Admin status:', isAdmin, 'Requested userId:', userId);
    
    let query: any = {};
    
    if (isAdmin) {
      // Admin can view all subscriptions or filter by userId
      if (userId) {
        query = { userId };
        console.log('👨‍💼 Admin viewing specific user subscriptions:', userId);
      } else {
        // Admin viewing all subscriptions
        console.log('👨‍💼 Admin viewing all subscriptions');
      }
    } else {
      // Regular users can only view their own subscriptions
      query = { userId: session.user.id };
      console.log('👤 User viewing own subscriptions');
    }

    console.log('📊 Fetching subscriptions with query:', query);
    const subscriptions = await (Subscription.find as any)(query)
      .populate('userId', 'name email champId phone mobile gender preferredTimeSlot champType preferredSport selectedCourt')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ nextDueDate: 1, createdAt: -1 });

    console.log('📊 Found', subscriptions.length, 'subscriptions');

    // For admin requests, calculate overdue status
    if (isAdmin && subscriptions.length > 0) {
      console.log('📊 Calculating overdue status for admin view...');
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

      console.log('✅ Returning', subscriptionsWithStatus.length, 'subscriptions with overdue status');
      return NextResponse.json({ 
        success: true,
        subscriptions: subscriptionsWithStatus 
      });
    }

    console.log('✅ Returning', subscriptions.length, 'subscriptions');
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