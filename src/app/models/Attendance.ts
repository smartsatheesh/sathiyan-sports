import mongoose from 'mongoose';

export interface IAttendance extends mongoose.Document {
  champId: string;
  loginTime: Date;
  logoutTime?: Date;
  date: string; // YYYY-MM-DD format for easy querying
  duration?: number; // in minutes
  isAutoLogout?: boolean;
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  markLogout(isAuto?: boolean): Promise<IAttendance>;
}

export interface IAttendanceModel extends mongoose.Model<IAttendance> {
  findActiveSession(champId: string, date?: string): Promise<IAttendance | null>;
  getDailyStats(date?: string): Promise<any[]>;
  getUserHistory(champId: string, limit?: number): Promise<IAttendance[]>;
  autoLogoutExpiredSessions(): Promise<IAttendance[]>;
}

const AttendanceSchema = new mongoose.Schema<IAttendance>({
  champId: {
    type: String,
    required: [true, 'ChampID is required'],
    index: true,
    uppercase: true,
    trim: true
  },
  loginTime: {
    type: Date,
    required: [true, 'Login time is required'],
    default: Date.now
  },
  logoutTime: {
    type: Date,
    default: null
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    index: true,
    // Format: YYYY-MM-DD
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  duration: {
    type: Number, // in minutes
    default: null,
    min: 0
  },
  isAutoLogout: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  collection: 'attendances'
});

// Indexes for efficient querying
AttendanceSchema.index({ champId: 1, date: 1 });
AttendanceSchema.index({ date: 1, status: 1 });
AttendanceSchema.index({ loginTime: 1 });
AttendanceSchema.index({ createdAt: 1 });

// Compound index for finding active sessions
AttendanceSchema.index({ champId: 1, status: 1, date: 1 });

// Pre-save middleware to set date and calculate duration
AttendanceSchema.pre('save', function(next) {
  // Set date field based on loginTime
  if (this.loginTime && !this.date) {
    this.date = this.loginTime.toISOString().split('T')[0];
  }
  
  // Calculate duration if logout time is set
  if (this.logoutTime && this.loginTime) {
    this.duration = Math.round((this.logoutTime.getTime() - this.loginTime.getTime()) / (1000 * 60));
    this.status = 'completed';
  }
  
  next();
});

// Instance method to mark logout
AttendanceSchema.methods.markLogout = function(isAuto: boolean = false) {
  this.logoutTime = new Date();
  this.isAutoLogout = isAuto;
  this.duration = Math.round((this.logoutTime.getTime() - this.loginTime.getTime()) / (1000 * 60));
  this.status = 'completed';
  return this.save();
};

// Static method to find active session for a ChampID
AttendanceSchema.statics.findActiveSession = function(champId: string, date?: string) {
  const queryDate = date || new Date().toISOString().split('T')[0];
  return this.findOne({
    champId: champId.toUpperCase(),
    date: queryDate,
    status: 'active'
  }).sort({ loginTime: -1 });
};

// Static method to get daily stats
AttendanceSchema.statics.getDailyStats = function(date?: string) {
  const queryDate = date || new Date().toISOString().split('T')[0];
  
  return this.aggregate([
    { $match: { date: queryDate } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalDuration: { $sum: '$duration' },
        averageDuration: { $avg: '$duration' },
        autoLogouts: {
          $sum: { $cond: ['$isAutoLogout', 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get user attendance history
AttendanceSchema.statics.getUserHistory = function(champId: string, limit: number = 30) {
  return this.find({
    champId: champId.toUpperCase()
  })
  .sort({ date: -1, loginTime: -1 })
  .limit(limit);
};

// Static method for auto-logout expired sessions
AttendanceSchema.statics.autoLogoutExpiredSessions = async function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const expiredSessions = await this.find({
    status: 'active',
    loginTime: { $lt: oneHourAgo }
  });
  
  const results = [];
  for (const session of expiredSessions) {
    await session.markLogout(true);
    results.push(session);
  }
  
  return results;
};

const Attendance = (mongoose.models.Attendance || mongoose.model<IAttendance, IAttendanceModel>('Attendance', AttendanceSchema)) as IAttendanceModel;

export default Attendance;