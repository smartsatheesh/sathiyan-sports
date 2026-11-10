import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  club?: string; // club slug; missing = Sathiyan
  champId: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  subscriptionType: 'monthly' | 'quarterly' | 'half yearly' | 'yearly';
  mode: 'fixed' | 'flexible';
  amount: number;
  duration: number; // in months
  startDate: Date;
  endDate: Date;
  paymentStatus: 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  paymentMethod?: 'UPI' | 'PhonePe' | 'GPay' | 'WhatsApp' | 'Cash';
  transactionId?: string;
  lastPaymentDate?: Date;
  nextDueDate: Date;
  autoRenewal: boolean;
  preferredSport?: 'Cricket' | 'Football' | 'Shuttle Badminton' | 'Functions and Events' | 'Body Zorb';
  preferredTimeSlot?: string;
  selectedCourt?: string; // Optional, only for badminton players
  notes?: string;
  // Renewal tracking fields
  subscriptionPeriodId: string; // Groups all renewals for same user/subscription
  isRenewal: boolean; // true if this is a renewal, false if original
  previousSubscriptionId?: mongoose.Types.ObjectId; // Links to previous period
  renewalNumber: number; // 1 for original, 2 for first renewal, etc.
  notificationsSent: {
    twoDaysBefore: boolean;
    onDueDate: boolean;
    twoDaysAfter: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const subscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Club the member belongs to (slug); missing = Sathiyan, the default club
  club: {
    type: String,
    index: true
  },
  champId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userMobile: {
    type: String,
    required: true
  },
  subscriptionType: {
    type: String,
    enum: ['monthly', 'quarterly', 'half yearly', 'yearly'],
    required: true
  },
  mode: {
    type: String,
    enum: ['fixed', 'flexible'],
    default: 'fixed'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    default: 1 // 1 month default
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'PhonePe', 'GPay', 'WhatsApp', 'Cash']
  },
  transactionId: {
    type: String,
    sparse: true
  },
  lastPaymentDate: {
    type: Date
  },
  nextDueDate: {
    type: Date,
    required: true,
    index: true
  },
  autoRenewal: {
    type: Boolean,
    default: false
  },
  preferredSport: {
    type: String,
    enum: ['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events', 'Body Zorb']
  },
  preferredTimeSlot: {
    type: String
  },
  selectedCourt: {
    type: String,
    enum: {
      values: ['S1', 'S2', 'S3'],
      message: "Selected court must be one of: S1, S2, S3"
    },
    validate: {
      validator: function(value) {
        // Only validate enum for badminton players
        if (this.preferredSport === "Shuttle Badminton") {
          return !value || ['S1', 'S2', 'S3'].includes(value);
        }
        // For other sports, allow any value or no value
        return true;
      },
      message: "Court selection is only applicable for Shuttle Badminton players"
    }
  },
  notes: {
    type: String
  },
  // Renewal tracking fields
  subscriptionPeriodId: {
    type: String,
    required: true,
    index: true
  },
  isRenewal: {
    type: Boolean,
    default: false,
    index: true
  },
  previousSubscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  renewalNumber: {
    type: Number,
    default: 1,
    index: true
  },
  notificationsSent: {
    twoDaysBefore: {
      type: Boolean,
      default: false
    },
    onDueDate: {
      type: Boolean,
      default: false
    },
    twoDaysAfter: {
      type: Boolean,
      default: false
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
subscriptionSchema.index({ userId: 1, paymentStatus: 1 });
subscriptionSchema.index({ nextDueDate: 1, paymentStatus: 1 });

// Pre-save middleware to calculate end date and next due date
subscriptionSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('duration')) {
    // Calculate end date
    const endDate = new Date(this.startDate);
    endDate.setMonth(endDate.getMonth() + this.duration);
    this.endDate = endDate;
    
    // Set next due date (same as end date for new subscriptions)
    if (this.isNew) {
      this.nextDueDate = new Date(endDate);
    }
  }
  next();
});

// Virtual for calculating days until due
subscriptionSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const timeDiff = this.nextDueDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  const today = new Date();
  return this.paymentStatus === 'Paid' && this.endDate >= today;
});

// Renew for the same duration starting at the current end date
subscriptionSchema.methods.renewSubscription = function() {
  const newStartDate = new Date(this.endDate);
  const newEndDate = new Date(newStartDate);
  newEndDate.setMonth(newEndDate.getMonth() + this.duration);
  
  this.startDate = newStartDate;
  this.endDate = newEndDate;
  this.nextDueDate = newEndDate;
  this.paymentStatus = 'Pending';
  this.notificationsSent = {
    twoDaysBefore: false,
    onDueDate: false,
    twoDaysAfter: false
  };
  
  return this.save();
};

export default mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', subscriptionSchema);