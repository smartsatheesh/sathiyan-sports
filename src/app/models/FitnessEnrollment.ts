import mongoose, { Schema, Document } from 'mongoose';

// Fitness Plan Enrollment Interface
export interface IFitnessEnrollment extends Document {
  enrollmentId: string;
  planId: string;
  planName: string;
  planCategory: 'strength' | 'speed' | 'stamina';
  planLevel: 'beginner' | 'intermediate' | 'advanced';
  planDuration: string;
  planPrice: number;
  
  // User Information
  userName: string;
  userEmail: string;
  userPhone: string;
  userExperience: string;
  userGoals?: string;
  medicalConditions?: string;
  
  // Enrollment Details
  enrollmentDate: Date;
  startDate?: Date;
  endDate?: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  
  // Progress Tracking
  totalDays: number;
  completedDays: number;
  currentWeek: number;
  progressPercentage: number;
  
  // Payment Information
  totalAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  upiTransactionId?: string;
  phonepeTransactionId?: string;
  
  // Additional Information
  notes?: string;
  trainerAssigned?: string;
  lastProgressUpdate?: Date;
}

// Fitness Plan Enrollment Schema
const FitnessEnrollmentSchema: Schema = new Schema({
  enrollmentId: {
    type: String,
    required: true,
    default: () => 'FP' + Date.now().toString().slice(-8)
  },
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  planCategory: {
    type: String,
    required: true,
    enum: ['strength', 'speed', 'stamina']
  },
  planLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  planDuration: {
    type: String,
    required: true
  },
  planPrice: {
    type: Number,
    required: true
  },
  
  // User Information
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    required: true
  },
  userExperience: {
    type: String,
    required: true
  },
  userGoals: {
    type: String
  },
  medicalConditions: {
    type: String
  },
  
  // Enrollment Details
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Progress Tracking
  totalDays: {
    type: Number,
    required: true
  },
  completedDays: {
    type: Number,
    default: 0
  },
  currentWeek: {
    type: Number,
    default: 1
  },
  progressPercentage: {
    type: Number,
    default: 0
  },
  
  // Payment Information
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String
  },
  paymentReference: {
    type: String
  },
  upiTransactionId: {
    type: String
  },
  phonepeTransactionId: {
    type: String
  },
  
  // Additional Information
  notes: {
    type: String
  },
  trainerAssigned: {
    type: String
  },
  lastProgressUpdate: {
    type: Date
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
FitnessEnrollmentSchema.index({ enrollmentId: 1 }, { unique: true });
FitnessEnrollmentSchema.index({ userEmail: 1 });
FitnessEnrollmentSchema.index({ userPhone: 1 });
FitnessEnrollmentSchema.index({ planCategory: 1 });
FitnessEnrollmentSchema.index({ status: 1 });
FitnessEnrollmentSchema.index({ paymentStatus: 1 });

// Pre-save middleware to calculate progress percentage
FitnessEnrollmentSchema.pre('save', function(this: IFitnessEnrollment, next) {
  if (this.totalDays > 0) {
    this.progressPercentage = Math.round((this.completedDays / this.totalDays) * 100);
  }
  next();
});

// Methods
FitnessEnrollmentSchema.methods.updateProgress = function(completedDays: number) {
  this.completedDays = completedDays;
  this.progressPercentage = Math.round((completedDays / this.totalDays) * 100);
  this.currentWeek = Math.ceil(completedDays / 7);
  this.lastProgressUpdate = new Date();
  
  if (this.progressPercentage >= 100) {
    this.status = 'completed';
    this.endDate = new Date();
  }
  
  return this.save();
};

// Static methods
FitnessEnrollmentSchema.statics.findByUser = function(userEmail: string) {
  return this.find({ userEmail }).sort({ enrollmentDate: -1 });
};

FitnessEnrollmentSchema.statics.findByCategory = function(category: string) {
  return this.find({ planCategory: category }).sort({ enrollmentDate: -1 });
};

FitnessEnrollmentSchema.statics.getActiveEnrollments = function() {
  return this.find({ status: 'active' }).sort({ enrollmentDate: -1 });
};

// Export the model
export default mongoose.models.FitnessEnrollment || 
  mongoose.model<IFitnessEnrollment>('FitnessEnrollment', FitnessEnrollmentSchema);
