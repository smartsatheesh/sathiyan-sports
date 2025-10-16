import mongoose, { Schema, Document } from 'mongoose';

// Payment Record Schema
const PaymentRecordSchema = new Schema({
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, required: true },
  status: {
    type: String,
    enum: ['completed', 'failed', 'pending', 'refunded'],
    required: true
  },
  transactionId: { type: String },
  billingPeriodStart: { type: Date, required: true },
  billingPeriodEnd: { type: Date, required: true },
  notes: { type: String }
}, { _id: false });

// Billing Cycle Interface
export interface IBillingCycle extends Document {
  userId: string;
  userEmail: string;
  userName: string;
  
  cycleType: 'monthly' | 'quarterly' | 'yearly';
  billingDate: number;
  currentAmount: number;
  currency: string;
  
  lastPaymentDate: Date;
  nextBillingDate: Date;
  paymentHistory: any[];
  
  reminderDays: number[];
  notificationPreferences: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
  
  status: 'active' | 'suspended' | 'cancelled' | 'overdue';
  autoRenewal: boolean;
  gracePeriodDays: number;
  overdueCount: number;
  
  createdAt: Date;
  lastUpdated: Date;
  notes?: string;
}

// Billing Cycle Schema
const BillingCycleSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  
  // Billing Configuration
  cycleType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true,
    default: 'monthly'
  },
  billingDate: {
    type: Number,
    required: true,
    min: 1,
    max: 28,
    default: 1
  },
  currentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  
  // Payment Tracking
  lastPaymentDate: {
    type: Date
  },
  nextBillingDate: {
    type: Date,
    required: true,
    index: true
  },
  paymentHistory: [PaymentRecordSchema],
  
  // Notification Settings
  reminderDays: {
    type: [Number],
    default: [7, 3, 1],
    validate: {
      validator: function(days: number[]) {
        return days.every(day => day >= 1 && day <= 30);
      },
      message: 'Reminder days must be between 1 and 30'
    }
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  
  // Status & Control
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled', 'overdue'],
    default: 'active',
    index: true
  },
  autoRenewal: {
    type: Boolean,
    default: true
  },
  gracePeriodDays: {
    type: Number,
    default: 7,
    min: 0,
    max: 30
  },
  overdueCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'billing_cycles'
});

// Billing Reminder Schema
const BillingReminderSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  billingCycleId: {
    type: Schema.Types.ObjectId,
    ref: 'BillingCycle',
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  
  // Reminder Details
  reminderType: {
    type: String,
    enum: ['upcoming_payment', 'overdue_payment', 'payment_failed', 'cycle_changed'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  daysUntilBilling: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  cycleType: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  sentAt: {
    type: Date
  },
  sentVia: [{
    type: String,
    enum: ['email', 'whatsapp', 'sms']
  }],
  
  // Content
  message: {
    type: String,
    required: true
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAttempt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'billing_reminders'
});

// Indexes for better performance
BillingCycleSchema.index({ nextBillingDate: 1, status: 1 });
BillingCycleSchema.index({ userId: 1, status: 1 });
BillingCycleSchema.index({ userEmail: 1 });

BillingReminderSchema.index({ scheduledDate: 1, status: 1 });
BillingReminderSchema.index({ userId: 1, status: 1 });

// Pre-save middleware to update lastUpdated
BillingCycleSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Instance methods for BillingCycle
BillingCycleSchema.methods.calculateNextBillingDate = function() {
  const currentDate = new Date();
  let nextDate = new Date();
  
  // Set to the billing date
  nextDate.setDate(this.billingDate);
  
  // If the billing date has already passed this month, move to next cycle
  if (nextDate <= currentDate) {
    switch (this.cycleType) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
  }
  
  this.nextBillingDate = nextDate;
  return nextDate;
};

BillingCycleSchema.methods.addPaymentRecord = function(paymentData: any) {
  const paymentRecord = {
    paymentId: paymentData.paymentId,
    amount: paymentData.amount,
    paymentDate: paymentData.paymentDate || new Date(),
    paymentMethod: paymentData.paymentMethod,
    status: paymentData.status,
    transactionId: paymentData.transactionId,
    billingPeriodStart: paymentData.billingPeriodStart,
    billingPeriodEnd: paymentData.billingPeriodEnd,
    notes: paymentData.notes
  };
  
  this.paymentHistory.push(paymentRecord);
  this.lastPaymentDate = paymentRecord.paymentDate;
  
  if (paymentRecord.status === 'completed') {
    this.overdueCount = 0;
    this.status = 'active';
    this.calculateNextBillingDate();
  }
  
  return this.save();
};

BillingCycleSchema.methods.markOverdue = function() {
  this.status = 'overdue';
  this.overdueCount += 1;
  return this.save();
};

// Static methods
BillingCycleSchema.statics.findDueForReminders = function(daysAhead: number = 7) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  
  return this.find({
    status: { $in: ['active', 'overdue'] },
    nextBillingDate: {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    }
  });
};

BillingCycleSchema.statics.findOverdue = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    status: { $in: ['active', 'overdue'] },
    nextBillingDate: { $lt: today }
  });
};

// Export models
const BillingCycle = mongoose.models.BillingCycle || 
  mongoose.model<IBillingCycle>('BillingCycle', BillingCycleSchema);

const BillingReminder = mongoose.models.BillingReminder || 
  mongoose.model('BillingReminder', BillingReminderSchema);

export { BillingCycle, BillingReminder };
export default BillingCycle;