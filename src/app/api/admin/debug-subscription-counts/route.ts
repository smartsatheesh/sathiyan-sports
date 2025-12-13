import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Subscription from '../../../models/Subscription';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();

    const { searchParams } = new URL(request.url);
    const createMissing = searchParams.get('createMissing') === 'true';

    // Count users marked as subscribed
    const subscribedUsers = await (User.countDocuments as any)({ subscribed: 'yes' });
    const totalUsers = await (User.countDocuments as any)({});
    
    // Get all users marked as subscribed to see their details
    const subscribedUsersList = await (User.find as any)({ subscribed: 'yes' })
      .select('name email champId paymentStatus subscribed createdAt subscriptionType champType preferredSport selectedCourt mobile')
      .sort({ createdAt: -1 });

    // Count actual subscription records
    const totalSubscriptions = await (Subscription.countDocuments as any)({});
    
    // Get all subscription records
    const allSubscriptions = await (Subscription.find as any)({})
      .populate('userId', 'name email champId')
      .select('userId userName userEmail amount paymentStatus status nextDueDate endDate createdAt')
      .sort({ createdAt: -1 });

    // Check for users with subscribed=yes but no subscription record
    const subscribedUserIds = subscribedUsersList.map(u => u._id.toString());
    const subscriptionUserIds = allSubscriptions
      .filter(s => s.userId && s.userId._id)
      .map(s => s.userId._id.toString());
    
    const usersWithoutSubscriptions = subscribedUsersList.filter(user => 
      !subscriptionUserIds.includes(user._id.toString())
    );

    // Create missing subscriptions if requested
    let createdSubscriptions = [];
    if (createMissing && usersWithoutSubscriptions.length > 0) {
      console.log(`Creating ${usersWithoutSubscriptions.length} missing subscription records...`);
      
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
          mode: 'Fixed',
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
            email: 'admin@sathiyansports.com'
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
    }

    // Calculate overdue and expired after potential creation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueSubscriptions = allSubscriptions.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return today > dueDate;
    });

    const activeByDueDate = allSubscriptions.filter(sub => {
      if (!sub.nextDueDate) return true; // No due date means ongoing
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today;
    });

    const expiredSubscriptions = allSubscriptions.filter(sub => {
      if (!sub.nextDueDate) return false;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return today > dueDate; // Same as overdue
    });

    return NextResponse.json({
      success: true,
      debug: {
        totalUsers,
        subscribedUsers,
        totalSubscriptions: createMissing ? totalSubscriptions + createdSubscriptions.length : totalSubscriptions,
        discrepancy: createMissing ? Math.max(0, subscribedUsers - (totalSubscriptions + createdSubscriptions.length)) : subscribedUsers - totalSubscriptions,
        overdueCount: overdueSubscriptions.length,
        expiredCount: expiredSubscriptions.length, // Should be same as overdue now
        activeByDueDateCount: activeByDueDate.length,
        usersWithoutSubscriptions: createMissing ? Math.max(0, usersWithoutSubscriptions.length - createdSubscriptions.length) : usersWithoutSubscriptions.length,
        createdSubscriptions: createMissing ? createdSubscriptions.length : 0,
        createdSubscriptionsDetails: createMissing ? createdSubscriptions : [],
        usersWithoutSubscriptionsDetails: createMissing ? [] : usersWithoutSubscriptions.map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          champId: u.champId,
          paymentStatus: u.paymentStatus,
          createdAt: u.createdAt
        })),
        overdueSubscriptionsDetails: overdueSubscriptions.map(s => ({
          _id: s._id,
          userName: s.userId?.name || s.userName,
          userEmail: s.userId?.email || s.userEmail,
          nextDueDate: s.nextDueDate,
          paymentStatus: s.paymentStatus,
          amount: s.amount
        }))
      }
    });
  } catch (error) {
    console.error('Debug subscription counts error:', error);
    return NextResponse.json({ error: 'Failed to debug subscription counts' }, { status: 500 });
  }
}