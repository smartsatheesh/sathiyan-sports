import { connectToDatabase } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';

class AttendanceScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.init();
  }

  private async init() {
    console.log('🕒 Initializing Attendance Scheduler...');
    
    // Start the auto-logout scheduler
    this.startScheduler();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  private startScheduler() {
    if (this.isRunning) {
      console.log('⚠️ Attendance Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Attendance Scheduler started - Auto-logout check every 10 minutes');

    // Run immediately
    this.performAutoLogout();

    // Then run every 10 minutes
    this.intervalId = setInterval(() => {
      this.performAutoLogout();
    }, 10 * 60 * 1000); // 10 minutes
  }

  private async performAutoLogout() {
    try {
      await connectToDatabase();
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Find active sessions that started more than 1 hour ago
      const expiredSessions = await Attendance.find({
        status: 'active',
        loginTime: { $lt: oneHourAgo }
      });

      if (expiredSessions.length > 0) {
        console.log(`🔄 Auto-logout: Found ${expiredSessions.length} expired sessions`);
        
        const results = [];
        for (const session of expiredSessions) {
          try {
            await session.markLogout(true);
            results.push({
              champId: session.champId,
              loginTime: session.loginTime,
              duration: session.duration
            });
            console.log(`✅ Auto-logged out: ${session.champId} (${session.duration} minutes)`);
          } catch (error: any) {
            console.error(`❌ Failed to auto-logout ${session.champId}:`, error.message);
          }
        }
        
        console.log(`✅ Auto-logout completed: ${results.length}/${expiredSessions.length} sessions processed`);
      } else {
        console.log('ℹ️ No expired sessions found for auto-logout');
      }
    } catch (error: any) {
      console.error('❌ Auto-logout scheduler error:', error.message);
    }
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Attendance Scheduler stopped');
  }

  public async forceAutoLogout() {
    console.log('🔧 Manual auto-logout triggered');
    return await this.performAutoLogout();
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId ? 'active' : 'inactive'
    };
  }
}

// Create singleton instance
let attendanceScheduler: AttendanceScheduler | null = null;

export function getAttendanceScheduler() {
  if (!attendanceScheduler) {
    attendanceScheduler = new AttendanceScheduler();
  }
  return attendanceScheduler;
}

export default AttendanceScheduler;