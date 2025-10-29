import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionType: 'Basic' | 'Premium' | 'Elite';
  amount: number;
  duration: number; // in months
  startDate: Date;
  endDate: Date;
  paymentStatus: 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentMethod?: 'PhonePe' | 'GPay' | 'WhatsApp' | 'Cash';
  transactionId?: string;
  lastPaymentDate?: Date;
  nextDueDate: Date;
  autoRenewal: boolean;
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
  subscriptionType: {
    type: String,
    enum: ['Basic', 'Premium', 'Elite'],
    required: true
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
  paymentMethod: {
    type: String,
    enum: ['PhonePe', 'GPay', 'WhatsApp', 'Cash']
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

// Static method to get subscription plans
subscriptionSchema.statics.getSubscriptionPlans = function() {
  return {
    Basic: {
      name: 'Basic Health Plan',
      amount: 500,
      duration: 1,
      features: ['Monthly health checkup', 'Basic fitness consultation', 'Health tips via WhatsApp']
    },
    Premium: {
      name: 'Premium Health Plan',
      amount: 1200,
      duration: 3,
      features: ['Weekly health checkup', 'Personalized fitness plan', 'Nutrition guidance', 'Priority booking']
    },
    Elite: {
      name: 'Elite Health Plan',
      amount: 2000,
      duration: 6,
      features: ['Daily health monitoring', 'Personal trainer sessions', 'Complete nutrition plan', 'Exclusive access to events', 'Health insurance consultation']
    }
  };
};

// Instance method to renew subscription
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