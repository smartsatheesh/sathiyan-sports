import { getAttendanceScheduler } from '../services/attendance-scheduler';

// Initialize attendance scheduler when the app starts
if (typeof window === 'undefined') {
  // Server-side only
  const initializeSchedulers = async () => {
    try {
      const scheduler = getAttendanceScheduler();
      console.log('🚀 Attendance system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize attendance scheduler:', error);
    }
  };
  
  // Initialize schedulers
  initializeSchedulers();
}

export { getAttendanceScheduler };