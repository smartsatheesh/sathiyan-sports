import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const { champId, qrData, mobile, quickAttendance } = await request.json();
    
    // Check if this is the universal QR code scan
    if (qrData === 'SATHIYAN_SPORTS_ATTENDANCE') {
      return NextResponse.json({
        success: true,
        action: 'universal_scan',
        message: 'Please enter your ChampID to mark attendance',
        requiresChampId: true
      });
    }
    
    if (!champId) {
      return NextResponse.json(
        { success: false, message: 'ChampID is required' },
        { status: 400 }
      );
    }

    const upperChampId = champId.toUpperCase().trim();
    
    // Verify user exists
    const user = await (User.findOne as any)({ champId: upperChampId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid ChampID. User not found.' },
        { status: 404 }
      );
    }

    // Verify mobile number if provided
    if (mobile && user.mobile && user.mobile !== mobile) {
      return NextResponse.json(
        { success: false, message: 'Mobile number does not match our records.' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check for today's attendance (completed sessions)
    const todayAttendance = await Attendance.findOne({
      champId: upperChampId,
      date: today,
      status: 'completed'
    });
    
    // Check for active session
    const activeSession = await Attendance.findActiveSession(upperChampId, today);
    
    // Check if user can attend multiple times (flexible attendance)
    const canAttendMultiple = user.mode === 'flexible' || user.flexibleAttendance === true;
    
    if (activeSession) {
      // User is logging out
      await activeSession.markLogout(false);
      
      return NextResponse.json({
        success: true,
        action: 'logout',
        message: `Goodbye ${user.name}! Session completed.`,
        data: {
          champId: upperChampId,
          name: user.name,
          mobile: user.mobile,
          loginTime: activeSession.loginTime,
          logoutTime: activeSession.logoutTime,
          duration: activeSession.duration,
          sessionId: activeSession._id,
          canAttendMultiple
        }
      });
    } else if (todayAttendance && !canAttendMultiple) {
      // User already has attendance for today and doesn't have flexible option
      return NextResponse.json({
        success: false,
        action: 'duplicate_not_allowed',
        message: `${user.name}, you have already marked attendance today. Contact admin for flexible attendance option.`,
        data: {
          champId: upperChampId,
          name: user.name,
          mobile: user.mobile,
          lastAttendanceDate: todayAttendance.date,
          canAttendMultiple
        }
      }, { status: 400 });
    } else {
      // User is logging in (either first time today or has flexible attendance)
      const newSession = new Attendance({
        champId: upperChampId,
        loginTime: new Date(),
        date: today,
        status: 'active'
      });
      
      await newSession.save();
      
      const attendanceType = todayAttendance ? 'additional' : 'first';
      const message = attendanceType === 'additional' 
        ? `Welcome back ${user.name}! Additional attendance marked.`
        : `Welcome ${user.name}! Attendance marked.`;
      
      return NextResponse.json({
        success: true,
        action: 'login',
        message,
        data: {
          champId: upperChampId,
          name: user.name,
          mobile: user.mobile,
          loginTime: newSession.loginTime,
          sessionId: newSession._id,
          canAttendMultiple,
          attendanceType
        }
      });
    }
    
  } catch (error: any) {
    console.error('Attendance scan error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process attendance',
        error: error.message 
      },
      { status: 500 }
    );
  }
}