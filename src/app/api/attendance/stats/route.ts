import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';
import User from '@/app/models/User';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Get daily stats
    const dailyStats = await Attendance.getDailyStats(date);
    const stats = dailyStats[0] || {
      totalSessions: 0,
      activeSessions: 0,
      completedSessions: 0,
      totalDuration: 0,
      averageDuration: 0,
      autoLogouts: 0
    };
    
    // Get currently active users
    const activeUsers = await Attendance.find({
      date: date,
      status: 'active'
    }).populate({
      path: 'champId',
      select: 'name champId',
      model: 'User',
      localField: 'champId',
      foreignField: 'champId'
    }).sort({ loginTime: -1 });
    
    // Get recent activity (last 10 actions)
    const recentActivity = await Attendance.find({
      date: date
    }).populate({
      path: 'champId',
      select: 'name champId',
      model: 'User',
      localField: 'champId',
      foreignField: 'champId'
    }).sort({ updatedAt: -1 }).limit(10);
    
    // Get weekly stats for comparison
    const weeklyStats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            $lte: date
          }
        }
      },
      {
        $group: {
          _id: '$date',
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          uniqueUsers: { $addToSet: '$champId' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Auto-logout expired sessions (users who forgot to logout after 1 hour)
    const expiredSessions = await Attendance.autoLogoutExpiredSessions();
    
    // Peak hours analysis for today
    const hourlyDistribution = await Attendance.aggregate([
      {
        $match: { date: date }
      },
      {
        $group: {
          _id: { $hour: '$loginTime' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        date: date,
        dailyStats: stats,
        activeUsers: activeUsers.map(session => ({
          champId: session.champId,
          loginTime: session.loginTime,
          duration: Math.round((new Date().getTime() - new Date(session.loginTime).getTime()) / (1000 * 60)),
          sessionId: session._id
        })),
        recentActivity: recentActivity.map(activity => ({
          champId: activity.champId,
          action: activity.status === 'active' ? 'login' : 'logout',
          time: activity.status === 'active' ? activity.loginTime : activity.logoutTime,
          duration: activity.duration,
          isAutoLogout: activity.isAutoLogout
        })),
        weeklyStats: weeklyStats,
        hourlyDistribution: hourlyDistribution,
        autoLoggedOut: expiredSessions.length,
        summary: {
          currentlyActive: stats.activeSessions,
          totalToday: stats.totalSessions,
          averageSessionTime: Math.round(stats.averageDuration || 0),
          totalTimeToday: Math.round(stats.totalDuration || 0)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Get attendance stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch attendance statistics',
        error: error.message 
      },
      { status: 500 }
    );
  }
}