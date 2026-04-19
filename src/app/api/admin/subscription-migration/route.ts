import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';
import Subscription from '@/app/models/Subscription';

// GET - Get migration status and stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();

    // Count users with subscribed = 'yes'
    const subscribedUsersCount = await (User.countDocuments as any)({
      subscribed: { $in: ['yes', 'Yes'] }
    });

    // Count total subscription records
    const activeSubscriptionsCount = await (Subscription.countDocuments as any)({});

    // Find users with subscribed = 'yes' but NO subscription record
    const usersWithoutSubscription = await (User.find as any)({
      subscribed: { $in: ['yes', 'Yes'] },
      $expr: { $not: [{ $in: ['$_id', (await (Subscription.distinct as any)('userId'))] }] }
    }).select('_id champId name email');

    // Count total users
    const totalUsers = await (User.countDocuments as any)({});

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        subscribedUsersMarkedYes: subscribedUsersCount,
        activeSubscriptionRecords: activeSubscriptionsCount,
        usersNeedingMigration: usersWithoutSubscription.length,
        dataIntegrity: subscribedUsersCount === activeSubscriptionsCount
      },
      usersNeedingMigration: usersWithoutSubscription
    });

  } catch (error) {
    console.error('Subscription migration GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migration status' },
      { status: 500 }
    );
  }
}

// POST - Migrate users with subscribed='yes' to subscription page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoose();
    const body = await request.json();
    const { action } = body;

    if (action === 'migrate-all') {
      // Find all users with subscribed = 'yes' but no subscription record
      const usersToMigrate = await (User.find as any)({
        subscribed: { $in: ['yes', 'Yes'] },
        $expr: { $not: [{ $in: ['$_id', (await (Subscription.distinct as any)('userId'))] }] }
      });

      let migratedCount = 0;
      const failedUsers = [];

      for (const user of usersToMigrate) {
        try {
          const ADULT_MALE_PRICING = {
            monthly: 1499,
            quarterly: 4299,
            'half yearly': 8099,
            yearly: 11499
          };

          const subscriptionType = user.subscriptionType || 'monthly';
          const durationMap = {
            'monthly': 1,
            'quarterly': 3,
            'half yearly': 6,
            'yearly': 12
          };

          const amount = ADULT_MALE_PRICING[subscriptionType] || ADULT_MALE_PRICING.monthly;
          const startDate = user.subscriptionStartDate || new Date();

          // Calculate next due date
          let dueDate = new Date(startDate);
          switch (subscriptionType) {
            case 'monthly':
              dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);
              break;
            case 'quarterly':
              const currentQuarter = Math.floor(dueDate.getMonth() / 3);
              const lastMonthOfQuarter = (currentQuarter + 1) * 3;
              dueDate = new Date(dueDate.getFullYear(), lastMonthOfQuarter, 0);
              break;
            case 'half yearly':
              const currentHalf = Math.floor(dueDate.getMonth() / 6);
              const lastMonthOfHalf = (currentHalf + 1) * 6;
              dueDate = new Date(dueDate.getFullYear(), lastMonthOfHalf, 0);
              break;
            case 'yearly':
              dueDate = new Date(dueDate.getFullYear(), 11, 31);
              break;
          }

          const subscription = await (Subscription.create as any)({
            userId: user._id,
            champId: user.champId,
            userName: user.name,
            userEmail: user.email,
            userMobile: user.mobile || user.phone,
            subscriptionType,
            amount,
            mode: user.mode || 'fixed',
            duration: durationMap[subscriptionType] || 1,
            startDate,
            endDate: user.subscriptionEndDate,
            nextDueDate: dueDate,
            paymentStatus: user.paymentStatus === 'completed' ? 'Paid' : 'Pending',
            lastPaymentDate: user.paymentStatus === 'completed' ? new Date() : null,
            status: 'active',
            preferredSport: user.preferredSport,
            selectedCourt: user.selectedCourt,
            autoRenewal: false,
            subscriptionPeriodId: `${user.champId}_${Date.now()}`,
            isRenewal: false,
            renewalNumber: 1,
            createdBy: user._id
          });

          migratedCount++;
          console.log(`✅ Migrated user ${user.name} (${user.champId}): ${subscription._id}`);
        } catch (err) {
          failedUsers.push({ 
            champId: user.champId, 
            name: user.name, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          });
          console.error(`❌ Failed to migrate user ${user.name}:`, err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Migration completed. ${migratedCount} users migrated.`,
        migratedCount,
        failedCount: failedUsers.length,
        failedUsers
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Subscription migration POST error:', error);
    return NextResponse.json(
      { error: 'Failed to perform migration' },
      { status: 500 }
    );
  }
}
