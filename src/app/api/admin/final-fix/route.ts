import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Subscription from '../../../models/Subscription';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();

    console.log('🔧 Starting final subscription fix...');

    // Get all users marked as subscribed
    const subscribedUsers = await (User.find as any)({ subscribed: 'yes' })
      .select('_id name email champId paymentStatus subscriptionType champType preferredSport selectedCourt preferredTimeSlot mobile createdAt');

    // Get all existing subscriptions with user data
    const existingSubscriptions = await (Subscription.find as any)({})
      .select('userId userName userEmail')
      .populate('userId', 'subscribed');

    console.log(`📊 Found ${subscribedUsers.length} subscribed users, ${existingSubscriptions.length} existing subscriptions`);

    // Find users without subscription records
    const usersWithoutSubscriptions = subscribedUsers.filter(user => 
      !existingSubscriptions.some(sub => sub.userId?._id?.toString() === user._id.toString())
    );

    // Find subscriptions without valid subscribed users (orphaned)
    const orphanedSubscriptions = existingSubscriptions.filter(sub => 
      !sub.userId || sub.userId.subscribed !== 'yes'
    );

    console.log(`🔥 Creating ${usersWithoutSubscriptions.length} missing subscription records...`);
    console.log(`🗑️  Removing ${orphanedSubscriptions.length} orphaned subscriptions...`);

    // Remove orphaned subscriptions first
    let removedCount = 0;
    for (const orphan of orphanedSubscriptions) {
      try {
        await (Subscription.findByIdAndDelete as any)(orphan._id);
        removedCount++;
        console.log(`🗑️  Removed orphaned subscription for ${orphan.userName}`);
      } catch (error) {
        console.error(`❌ Failed to remove orphaned subscription for ${orphan.userName}:`, error.message);
      }
    }

    // Get admin user for createdBy field
    let adminUser = await (User.findOne as any)({ email: 'admin@sathiyansports.com' });
    if (!adminUser) {
      adminUser = await (User.findOne as any)({ role: 'admin' });
    }

    // Create missing subscription records
    let createdCount = 0;
    for (const user of usersWithoutSubscriptions) {
      try {
        const subscriptionType = user.subscriptionType || 'monthly';
        
        // Calculate amount based on champion type
        const calculateAmount = (champType, subscriptionType) => {
          const PRICING = {
            kids: { monthly: 1500, quarterly: 4000, 'half yearly': 8000, yearly: 13000 },
            adult: { monthly: 1199, quarterly: 3399, 'half yearly': 6299, yearly: 11499 },
            veteran: { monthly: 1199, quarterly: 3399, 'half yearly': 6299, yearly: 11499 }
          };
          
          const type = (champType || 'adult').toLowerCase();
          const period = (subscriptionType || 'monthly').toLowerCase();
          
          return PRICING[type]?.[period] || PRICING.adult.monthly;
        };

        // Set payment status based on user's payment status
        let paymentStatus = 'Pending';
        if (user.paymentStatus === 'completed') {
          paymentStatus = 'Paid';
        } else if (user.paymentStatus === 'pending') {
          paymentStatus = 'Pending';
        } else if (user.paymentStatus === 'failed') {
          paymentStatus = 'Failed';
        }

        // Calculate dates
        const startDate = user.createdAt || new Date();
        const duration = subscriptionType === 'yearly' ? 12 : 
                        subscriptionType === 'quarterly' ? 3 :
                        subscriptionType === 'half yearly' ? 6 : 1;

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + duration);

        // For paid users, set next due date to future
        // For pending users, set next due date appropriately
        let nextDueDate = new Date();
        if (paymentStatus === 'Paid') {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1); // Next month for paid users
        } else {
          nextDueDate.setDate(nextDueDate.getDate() + 1); // Tomorrow for pending (give them a day)
        }

        const amount = calculateAmount(user.champType, subscriptionType);

        const subscriptionData = {
          userId: user._id,
          champId: user.champId || `AUTO-${user._id.toString().slice(-6)}`,
          userName: user.name,
          userEmail: user.email,
          userMobile: user.mobile || '',
          subscriptionType: subscriptionType,
          mode: 'fixed',
          amount: amount,
          duration: duration,
          startDate: startDate,
          endDate: endDate,
          status: 'active',
          paymentStatus: paymentStatus,
          paymentMethod: paymentStatus === 'Paid' ? 'Cash' : undefined,
          preferredSport: user.preferredSport || 'Shuttle Badminton',
          selectedCourt: (user.preferredSport === 'Shuttle Badminton') ? (user.selectedCourt || 'S1') : undefined,
          nextDueDate: nextDueDate,
          autoRenewal: false,
          notificationsSent: {
            twoDaysBefore: false,
            onDueDate: false,
            twoDaysAfter: false
          },
          createdBy: adminUser ? adminUser._id : user._id
        };

        const newSubscription = new Subscription(subscriptionData);
        await newSubscription.save();
        createdCount++;

        console.log(`✅ Created subscription for ${user.name} - Status: ${paymentStatus}`);
      } catch (error) {
        console.error(`❌ Failed to create subscription for ${user.name}:`, error.message);
      }
    }

    // Get final counts
    const finalSubscriptionCount = await (Subscription.countDocuments as any)({});
    const finalUserCount = await (User.countDocuments as any)({ subscribed: 'yes' });

    return NextResponse.json({
      success: true,
      message: `Final subscription fix completed`,
      results: {
        subscribedUsers: finalUserCount,
        totalSubscriptions: finalSubscriptionCount,
        createdSubscriptions: createdCount,
        removedSubscriptions: removedCount,
        finalDiscrepancy: finalUserCount - finalSubscriptionCount
      }
    });

  } catch (error) {
    console.error('❌ Final sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}