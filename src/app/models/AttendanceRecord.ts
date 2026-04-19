import mongoose from 'mongoose';

export interface IAttendanceRecord extends mongoose.Document {
  date: string; // YYYY-MM-DD format
  champId: string;
  studentName: string;
  studentEmail: string;
  sport: string;
  timeSlot: string;
  isPresent: boolean;
  markedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  markedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceRecordSchema = new mongoose.Schema<IAttendanceRecord>({
  date: {
    type: String,
    required: [true, 'Date is required'],
    index: true,
    // Format: YYYY-MM-DD
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  champId: {
    type: String,
    required: [true, 'Champion ID is required'],
    index: true,
    uppercase: true,
    trim: true
  },
  studentName: {
    type: String,
    required: [true, 'Student name is required']
  },
  studentEmail: {
    type: String,
    required: [true, 'Student email is required']
  },
  sport: {
    type: String,
    required: [true, 'Sport is required'],
    enum: ['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events', 'Body Zorb']
  },
  timeSlot: {
    type: String,
    required: [true, 'Time slot is required']
  },
  isPresent: {
    type: Boolean,
    required: [true, 'Attendance status is required'],
    default: false
  },
  markedBy: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'coach'],
      required: true
    }
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
attendanceRecordSchema.index({ date: 1, champId: 1 });
attendanceRecordSchema.index({ date: 1, sport: 1 });

// Update timestamp on save
attendanceRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);

export default AttendanceRecord;
