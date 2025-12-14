import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    // Auto-logout expired sessions
    const expiredSessions = await Attendance.autoLogoutExpiredSessions();
    
    return NextResponse.json({
      success: true,
      message: `Auto-logged out ${expiredSessions.length} expired sessions`,
      data: {
        autoLoggedOut: expiredSessions.length,
        sessions: expiredSessions.map(session => ({
          champId: session.champId,
          loginTime: session.loginTime,
          logoutTime: session.logoutTime,
          duration: session.duration
        }))
      }
    });
    
  } catch (error: any) {
    console.error('Auto-logout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process auto-logout',
        error: error.message 
      },
      { status: 500 }
    );
  }
}