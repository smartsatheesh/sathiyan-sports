import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Subscription from '../../../models/Subscription';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'coach')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();

    // Find users marked as subscribed but without subscription records
    const subscribedUsers = await (User.find as any)({ subscribed: 'yes' })
      .select('_id name email champId paymentStatus subscriptionType champType preferredSport selectedCourt preferredTimeSlot createdAt mobile');

    const allSubscriptions = await (Subscription.find as any)({})
      .select('userId')
      .populate('userId', '_id');

    const subscriptionUserIds = allSubscriptions
      .filter(s => s.userId && s.userId._id)
      .map(s => s.userId._id.toString());

    const usersWithoutSubscriptions = subscribedUsers.filter(user => 
      !subscriptionUserIds.includes(user._id.toString())
    );

    console.log(`Found ${usersWithoutSubscriptions.length} users without subscription records`);

    if (usersWithoutSubscriptions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No missing subscription records to create',
        created: 0
      });
    }

    const createdSubscriptions = [];

    for (const user of usersWithoutSubscriptions) {
      // Calculate subscription amount based on user details
      const calculateAmount = (champType: string, subscriptionType: string) => {
        const PRICING = {
          kids: { monthly: 1500, quarterly: 4000, 'half yearly': 8000, yearly: 13000 },
          adult: { monthly: 1199, quarterly: 3399, 'half yearly': 6299, yearly: 11499 },
          veteran: { monthly: 1199, quarterly: 3399, 'half yearly': 6299, yearly: 11499 }
        };
        
        const type = champType?.toLowerCase() || 'adult';
        const period = subscriptionType?.toLowerCase() || 'monthly';
        
        return PRICING[type]?.[period] || PRICING.adult.monthly;
      };

      // Calculate dates
      const startDate = user.createdAt || new Date();
      const subscriptionType = user.subscriptionType || 'monthly';
      const duration = subscriptionType === 'yearly' ? 12 : 
                      subscriptionType === 'quarterly' ? 3 :
                      subscriptionType === 'half yearly' ? 6 : 1;

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);

      const nextDueDate = new Date(startDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1); // Monthly due regardless of subscription type

      const amount = calculateAmount(user.champType, user.subscriptionType);

      const subscriptionData = {
        userId: user._id,
        champId: user.champId || `LEGACY-${user._id.toString().slice(-6)}`,
        userName: user.name,
        userEmail: user.email,
        userMobile: user.mobile || '',
        subscriptionType: subscriptionType,
        mode: 'Fixed', // Default mode
        amount: amount,
        duration: duration,
        startDate: startDate,
        endDate: endDate,
        status: 'active',
        paymentStatus: user.paymentStatus || 'completed',
        paymentMethod: 'Legacy Import',
        preferredSport: user.preferredSport || 'Shuttle Badminton',
        selectedCourt: user.selectedCourt || 'S1',
        notes: `Auto-created subscription for legacy user - imported on ${new Date().toISOString()}`,
        nextDueDate: nextDueDate,
        autoRenewal: false,
        createdAt: user.createdAt || new Date(),
        createdBy: {
          name: 'System Admin',
          email: session.user.email
        }
      };

      try {
        const newSubscription = new Subscription(subscriptionData);
        const savedSubscription = await newSubscription.save();
        createdSubscriptions.push({
          userId: user._id,
          userName: user.name,
          subscriptionId: savedSubscription._id
        });
        console.log(`Created subscription for ${user.name} (${user.email})`);
      } catch (error) {
        console.error(`Failed to create subscription for ${user.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdSubscriptions.length} subscription records`,
      created: createdSubscriptions.length,
      totalMissing: usersWithoutSubscriptions.length,
      createdSubscriptions: createdSubscriptions
    });

  } catch (error) {
    console.error('Error creating missing subscriptions:', error);
    return NextResponse.json({ 
      error: 'Failed to create missing subscription records',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}