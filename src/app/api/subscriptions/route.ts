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

    // Calculate amount based on gender, time slot, and mode
    
    // Helper function to check if time slot qualifies for female discount
    const isFemalDiscountTimeSlot = (timeSlot: string) => {
      if (!timeSlot) return false;
      
      // Extract start time from time slot
      const startTime = timeSlot.split(' - ')[0];
      
      // Convert time to 24-hour format
      const convertTo24Hour = (time: string) => {
        const [timePart, period] = time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return hours + minutes / 60;
      };
      
      const startHour = convertTo24Hour(startTime);
      
      // Female discount applies from 10:00 AM (10.0) to 4:00 PM (16.0)
      return startHour >= 10.0 && startHour < 16.0;
    };

    const basePrices = {
      monthly: { male: 1199, female: 799 },
      quarterly: { male: 3399, female: 2099 },
      'half yearly': { male: 6299, female: 4099 },
      yearly: { male: 11499, female: 8399 }
    };

    // Determine pricing for females based on time slot
    let genderForPricing = user.gender;
    if (user.gender === 'female' && user.preferredTimeSlot && !isFemalDiscountTimeSlot(user.preferredTimeSlot)) {
      // Female selected time slot outside 10 AM - 4 PM, use male pricing
      genderForPricing = 'male';
    }

    const basePrice = basePrices[subscriptionType][genderForPricing];
    const flexibleSurcharge = mode === 'flexible' ? 500 : 0;
    const totalAmount = basePrice + flexibleSurcharge;

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMap[subscriptionType]);

    // Generate unique subscription period ID (for grouping renewals)
    const subscriptionPeriodId = `${user.champId}_${Date.now()}`;

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
      // Renewal tracking fields
      subscriptionPeriodId,
      isRenewal: false,
      renewalNumber: 1,
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