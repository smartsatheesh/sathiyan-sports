import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Subscription from '@/app/models/Subscription';
import User from '@/app/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const body = await request.json();
    const { 
      userId, 
      subscriptionType, 
      mode = 'standard',
      paymentMethod,
      transactionId,
      notes 
    } = body;

    // Validate required fields
    if (!userId || !subscriptionType) {
      return NextResponse.json(
        { error: 'User ID and subscription type are required' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await (User.findById as any)(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate duration based on subscription type
    const durationMap = {
      'monthly': 1,
      'quarterly': 3,
      'half yearly': 6,
      'yearly': 12
    };

    // Calculate amount based on gender and mode
    const basePrices = {
      monthly: { male: 800, female: 700 },
      quarterly: { male: 2200, female: 1900 },
      'half yearly': { male: 4000, female: 3500 },
      yearly: { male: 7500, female: 6500 }
    };

    const basePrice = basePrices[subscriptionType][user.gender];
    const flexibleSurcharge = mode === 'flexible' ? 500 : 0;
    const totalAmount = basePrice + flexibleSurcharge;

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMap[subscriptionType]);

    // Create subscription entry
    const subscription = await (Subscription.create as any)({
      userId: user._id,
      champId: user.champId,
      userName: user.name,
      userEmail: user.email,
      userMobile: user.mobile,
      subscriptionType,
      mode,
      amount: totalAmount,
      duration: durationMap[subscriptionType],
      startDate,
      endDate,
      nextDueDate: endDate,
      paymentStatus: transactionId ? 'Paid' : 'Pending',
      status: 'active',
      paymentMethod,
      transactionId,
      lastPaymentDate: transactionId ? startDate : undefined,
      preferredSport: user.sport,
      preferredTimeSlot: user.timeSlot,
      selectedCourt: user.selectedCourt,
      notes,
      autoRenewal: false,
      createdBy: user._id
    });

    await subscription.save();

    // Update user with subscription reference if needed
    await (User.findByIdAndUpdate as any)(userId, {
      hasActiveSubscription: true,
      lastSubscriptionDate: startDate
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      subscription: {
        id: subscription._id,
        champId: subscription.champId,
        subscriptionType: subscription.subscriptionType,
        mode: subscription.mode,
        amount: subscription.amount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    let query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const subscriptions = await (Subscription.find as any)(query)
      .populate('userId', 'name email champId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await (Subscription.countDocuments as any)(query);

    return NextResponse.json({
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}