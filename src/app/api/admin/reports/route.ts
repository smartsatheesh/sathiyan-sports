import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { CoachUser } from '../../../models/CoachUser';
import { GeneratedPlan } from '../../../models/GeneratedPlan';
import {
  getCoachUsersCollection,
  getGeneratedPlansCollection,
  getCoachSessionsCollection,
} from '../../../server/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin or coach
    if (!session?.user?.id || (session?.user?.role !== 'admin' && session?.user?.role !== 'coach')) {
      return NextResponse.json(
        { success: false, error: 'Admin or Coach access required' }, 
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'thisMonth';
    const sport = url.searchParams.get('sport') || 'all';

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'thisWeek':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get collections
    const coachUsersCollection = await getCoachUsersCollection();
    const plansCollection = await getGeneratedPlansCollection();
    const sessionsCollection = await getCoachSessionsCollection();

    // Build query filters
    const dateFilter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const sportFilter = sport !== 'all' ? { sport } : {};

    // Get athlete data
    const athleteQuery = { ...dateFilter, ...sportFilter };
    const athletes = await coachUsersCollection
      .find(athleteQuery)
      .sort({ createdAt: -1 })
      .toArray();

    // Get plans data
    const plans = await plansCollection
      .find({
        generatedAt: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .sort({ generatedAt: -1 })
      .toArray();

    // Get sessions data
    const sessions = await sessionsCollection
      .find({
        sessionStart: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .sort({ sessionStart: -1 })
      .toArray();

    // Calculate statistics
    const totalPlansGenerated = plans.length;
    const activeAthletes = athletes.length;
    const completedSessions = sessions.filter(s => s.finalPlanGenerated).length;
    const completionRate = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;

    // Calculate top sports
    const sportCounts: { [key: string]: number } = {};
    athletes.forEach(athlete => {
      const sport = athlete.sport || 'Unknown';
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    });

    const topSports = Object.entries(sportCounts)
      .map(([sport, count]) => ({ sport, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate weekly progress
    const weeklyProgress = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + (i * 7)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekSessions = await sessionsCollection.countDocuments({
        sessionStart: {
          $gte: weekStart,
          $lte: weekEnd
        }
      });

      const weekCompleted = await sessionsCollection.countDocuments({
        sessionStart: {
          $gte: weekStart,
          $lte: weekEnd
        },
        finalPlanGenerated: true
      });

      weeklyProgress.push({
        week: `Week ${4 - i}`,
        completed: weekCompleted,
        total: weekSessions
      });
    }

    // Transform athlete data to match frontend interface
    const transformedAthletes = athletes.map(athlete => {
      const relatedPlan = plans.find(p => p.coachUserId === athlete._id?.toString());
      const relatedSession = sessions.find(s => s.userId === athlete.userId);

      return {
        id: athlete._id.toString(),
        name: athlete.name,
        sport: athlete.sport || 'Unknown',
        skillLevel: athlete.skillLevel || 'Unknown',
        planGeneratedDate: relatedPlan?.generatedAt || athlete.createdAt,
        planProgress: Math.floor(Math.random() * 100), // This would need to be calculated from actual progress data
        completedWorkouts: Math.floor(Math.random() * 50), // This would come from workout completion tracking
        totalWorkouts: 60, // This would come from the plan structure
        lastActiveDate: relatedSession?.sessionEnd || athlete.updatedAt || athlete.createdAt,
        monthlyFocus: relatedPlan?.planData?.overview?.split(',') || ['General Training'],
        currentWeek: Math.floor(Math.random() * 4) + 1,
        currentMonth: Math.floor(Math.random() * 3) + 1
      };
    });

    const coachReport = {
      totalPlansGenerated,
      activeAthletes,
      completionRate,
      topSports,
      weeklyProgress
    };

    return NextResponse.json({
      success: true,
      athleteData: transformedAthletes,
      coachReport,
      dateRange,
      sport,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin Reports API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}