import { NextRequest, NextResponse } from 'next/server';
import Subscription from '../../../models/Subscription';
import { connectToMongoose } from '../../../server/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = {};
    
    if (period !== 'all') {
      const now = new Date();
      switch (period) {
        case 'month':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
            }
          };
          break;
        case 'quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
          dateFilter = {
            createdAt: { $gte: quarterStart, $lte: quarterEnd }
          };
          break;
        case 'year':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), 0, 1),
              $lte: new Date(now.getFullYear(), 11, 31)
            }
          };
          break;
        case 'custom':
          if (startDate && endDate) {
            dateFilter = {
              createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
              }
            };
          }
          break;
      }
    }

    // Get subscription statistics
    const totalSubscriptions = await Subscription.countDocuments(dateFilter);
    
    const activeSubscriptions = await Subscription.countDocuments({
      ...dateFilter,
      paymentStatus: 'Paid',
      endDate: { $gte: new Date() }
    });

    const pendingSubscriptions = await Subscription.countDocuments({
      ...dateFilter,
      paymentStatus: 'Pending'
    });

    const overdueSubscriptions = await Subscription.countDocuments({
      ...dateFilter,
      paymentStatus: 'Overdue'
    });

    // Revenue statistics
    const revenueData = await Subscription.aggregate([
      { $match: { ...dateFilter, paymentStatus: 'Paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const averageAmount = revenueData[0]?.averageAmount || 0;

    // Subscription type breakdown
    const subscriptionTypeStats = await Subscription.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$subscriptionType',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    // Monthly trend (for charts)
    const monthlyStats = await Subscription.aggregate([
      { 
        $match: { 
          createdAt: { 
            $gte: new Date(new Date().getFullYear(), 0, 1) 
          } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          subscriptions: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$amount', 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Upcoming renewals (next 30 days)
    const upcomingRenewals = await Subscription.countDocuments({
      paymentStatus: 'Paid',
      nextDueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });

    return NextResponse.json({
      overview: {
        totalSubscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        overdueSubscriptions,
        totalRevenue,
        averageAmount,
        upcomingRenewals
      },
      subscriptionTypeStats,
      monthlyStats,
      period
    });

  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription statistics' }, { status: 500 });
  }
}