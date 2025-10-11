import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { 
  getCoachUsersCollection, 
  getGeneratedPlansCollection, 
  getCoachSessionsCollection
} from '../../../server/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' }, 
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'overview';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    const result: any = {};

    if (type === 'overview' || type === 'users') {
      const coachUsersCollection = await getCoachUsersCollection();
      
      const users = await coachUsersCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      const totalUsers = await coachUsersCollection.countDocuments();
      
      result.users = {
        data: users,
        total: totalUsers,
        limit,
        skip
      };
    }

    if (type === 'overview' || type === 'plans') {
      const plansCollection = await getGeneratedPlansCollection();
      
      const plans = await plansCollection
        .find({})
        .sort({ generatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      const totalPlans = await plansCollection.countDocuments();
      const activePlans = await plansCollection.countDocuments({ isActive: true });
      
      result.plans = {
        data: plans,
        total: totalPlans,
        active: activePlans,
        limit,
        skip
      };
    }

    if (type === 'overview' || type === 'sessions') {
      const sessionsCollection = await getCoachSessionsCollection();
      
      const sessions = await sessionsCollection
        .find({})
        .sort({ sessionStart: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      const totalSessions = await sessionsCollection.countDocuments();
      const completedSessions = await sessionsCollection.countDocuments({ 
        finalPlanGenerated: true 
      });
      
      result.sessions = {
        data: sessions,
        total: totalSessions,
        completed: completedSessions,
        limit,
        skip
      };
    }

    if (type === 'overview' || type === 'stats') {
      const coachUsersCollection = await getCoachUsersCollection();
      const plansCollection = await getGeneratedPlansCollection();
      const sessionsCollection = await getCoachSessionsCollection();

      // Get statistics
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        totalUsers: await coachUsersCollection.countDocuments(),
        totalPlans: await plansCollection.countDocuments(),
        totalSessions: await sessionsCollection.countDocuments(),
        activePlans: await plansCollection.countDocuments({ isActive: true }),
        completedSessions: await sessionsCollection.countDocuments({ finalPlanGenerated: true }),
        newUsersLast30Days: await coachUsersCollection.countDocuments({ 
          createdAt: { $gte: last30Days } 
        }),
        newUsersLast7Days: await coachUsersCollection.countDocuments({ 
          createdAt: { $gte: last7Days } 
        }),
        plansLast30Days: await plansCollection.countDocuments({ 
          generatedAt: { $gte: last30Days } 
        }),
        plansLast7Days: await plansCollection.countDocuments({ 
          generatedAt: { $gte: last7Days } 
        }),
        // Sport distribution
        sportStats: await coachUsersCollection.aggregate([
          { $group: { _id: '$sport', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray(),
        // Goal distribution
        goalStats: await coachUsersCollection.aggregate([
          { $group: { _id: '$goal', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray(),
        // Skill level distribution
        skillLevelStats: await coachUsersCollection.aggregate([
          { $group: { _id: '$skillLevel', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray()
      };

      result.stats = stats;
    }

    return NextResponse.json({ 
      success: true, 
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Coach Admin API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve coach admin data' },
      { status: 500 }
    );
  }
}

// DELETE endpoint for admin to remove coach data
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'user':
        const coachUsersCollection = await getCoachUsersCollection();
        result = await coachUsersCollection.deleteOne({ _id: id });
        break;
      
      case 'plan':
        const plansCollection = await getGeneratedPlansCollection();
        result = await plansCollection.deleteOne({ _id: id });
        break;
      
      case 'session':
        const sessionsCollection = await getCoachSessionsCollection();
        result = await sessionsCollection.deleteOne({ _id: id });
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type specified' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount > 0,
      message: `${type} ${result.deletedCount > 0 ? 'deleted' : 'not found'}`
    });

  } catch (error) {
    console.error('❌ Coach Admin Delete API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete coach data' },
      { status: 500 }
    );
  }
}