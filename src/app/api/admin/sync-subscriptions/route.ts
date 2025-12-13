import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Subscription from '../../../models/Subscription';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();

    console.log('🔧 Starting subscription sync...');

    // Get all users marked as subscribed
    const subscribedUsers = await (User.find as any)({ subscribed: 'yes' })
      .select('_id name email champId paymentStatus subscriptionType champType preferredSport selectedCourt preferredTimeSlot mobile createdAt');

    // Get all existing subscription userIds
    const existingSubscriptions = await (Subscription.find as any)({})
      .select('userId');

    const existingUserIds = existingSubscriptions.map(sub => sub.userId?.toString()).filter(Boolean);

    // Find users without subscription records
    const usersWithoutSubscriptions = subscribedUsers.filter(user => 
      !existingUserIds.includes(user._id.toString())
    );

    console.log(`📊 Found ${subscribedUsers.length} subscribed users, ${existingSubscriptions.length} existing subscriptions`);
    console.log(`🔥 Creating ${usersWithoutSubscriptions.length} missing subscription records...`);

    let createdCount = 0;
    let updatedCount = 0;

    // Create missing subscription records
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
        // For pending users, set next due date to now or past (so they show as due)
        let nextDueDate = new Date();
        if (paymentStatus === 'Paid') {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1); // Next month
        } else {
          nextDueDate.setDate(nextDueDate.getDate() - 1); // Yesterday (overdue)
        }

        const amount = calculateAmount(user.champType, subscriptionType);

        // Find or create a system admin user ID for createdBy
        let adminUser = await (User.findOne as any)({ email: 'admin@sathiyansports.com' });
        if (!adminUser) {
          // Use the first admin user if system admin doesn't exist
          adminUser = await (User.findOne as any)({ role: 'admin' });
        }
        
        const subscriptionData = {
          userId: user._id,
          champId: user.champId || `AUTO-${user._id.toString().slice(-6)}`,
          userName: user.name,
          userEmail: user.email,
          userMobile: user.mobile || '',
          subscriptionType: subscriptionType,
          mode: 'fixed', // lowercase to match enum
          amount: amount,
          duration: duration,
          startDate: startDate,
          endDate: endDate,
          status: 'active',
          paymentStatus: paymentStatus,
          paymentMethod: paymentStatus === 'Paid' ? 'Cash' : undefined, // Only set for paid users
          preferredSport: user.preferredSport || 'Shuttle Badminton',
          selectedCourt: (user.preferredSport === 'Shuttle Badminton') ? (user.selectedCourt || 'S1') : undefined,
          nextDueDate: nextDueDate,
          autoRenewal: false,
          notificationsSent: {
            twoDaysBefore: false,
            onDueDate: false,
            twoDaysAfter: false
          },
          createdBy: adminUser ? adminUser._id : user._id // Use admin or fallback to user
        };

        const newSubscription = new Subscription(subscriptionData);
        await newSubscription.save();
        createdCount++;

        console.log(`✅ Created subscription for ${user.name} - Status: ${paymentStatus}`);
      } catch (error) {
        console.error(`❌ Failed to create subscription for ${user.name}:`, error.message);
      }
    }

    // Now update existing subscriptions to match user payment status
    console.log('🔄 Updating existing subscription statuses...');
    
    for (const user of subscribedUsers) {
      try {
        const existingSubscription = await (Subscription.findOne as any)({ userId: user._id });
        
        if (existingSubscription) {
          let paymentStatus = existingSubscription.paymentStatus;
          let needsUpdate = false;

          // Sync payment status with user
          if (user.paymentStatus === 'completed' && paymentStatus !== 'Paid') {
            paymentStatus = 'Paid';
            needsUpdate = true;
          } else if (user.paymentStatus === 'pending' && paymentStatus !== 'Pending') {
            paymentStatus = 'Pending';
            needsUpdate = true;
          }

          if (needsUpdate) {
            // Update next due date based on payment status
            let nextDueDate = existingSubscription.nextDueDate;
            if (paymentStatus === 'Paid') {
              // If now paid, set next due date to future
              nextDueDate = new Date();
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            }

            await (Subscription.findByIdAndUpdate as any)(existingSubscription._id, {
              paymentStatus,
              nextDueDate,
              updatedAt: new Date()
            });

            updatedCount++;
            console.log(`🔄 Updated ${user.name}: ${existingSubscription.paymentStatus} → ${paymentStatus}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to update subscription for ${user.name}:`, error.message);
      }
    }

    // Get final counts
    const finalSubscriptionCount = await (Subscription.countDocuments as any)({});
    const finalUserCount = await (User.countDocuments as any)({ subscribed: 'yes' });

    return NextResponse.json({
      success: true,
      message: `Subscription sync completed`,
      results: {
        subscribedUsers: finalUserCount,
        totalSubscriptions: finalSubscriptionCount,
        createdSubscriptions: createdCount,
        updatedSubscriptions: updatedCount,
        finalDiscrepancy: finalUserCount - finalSubscriptionCount
      }
    });

  } catch (error) {
    console.error('❌ Subscription sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}