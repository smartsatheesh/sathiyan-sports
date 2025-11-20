import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
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
  paymentMethod?: 'PhonePe' | 'GPay' | 'WhatsApp' | 'Cash';
  transactionId?: string;
  lastPaymentDate?: Date;
  nextDueDate: Date;
  autoRenewal: boolean;
  preferredSport?: 'Cricket' | 'Football' | 'Shuttle Badminton' | 'Functions and Events';
  preferredTimeSlot?: string;
  selectedCourt?: string; // Optional, only for badminton players
  notes?: string;
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
  preferredSport: {
    type: String,
    enum: ['Cricket', 'Football', 'Shuttle Badminton', 'Functions and Events']
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
subscriptionSchema.statics.getSubscriptionPlans = function(gender = 'male', mode = 'standard', preferredTimeSlot = null) {
  // Helper function to check if time slot qualifies for female discount
  const isFemalDiscountTimeSlot = (timeSlot: string) => {
    if (!timeSlot) return false;
    
    // Extract start time from time slot
    const startTime = timeSlot.split(' - ')[0];
    
    // Convert time to 24-hour format
    const convertTo24Hour = (time: string) => {
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return hours + minutes / 60;
    };
    
    const startHour = convertTo24Hour(startTime);
    
    // Female discount applies from 10:00 AM (10.0) to 4:00 PM (16.0)
    return startHour >= 10.0 && startHour < 16.0;
  };

  const basePrices = {
    monthly: { male: 1199, female: 799 },
    quarterly: { male: 3399, female: 2099 },
    'half yearly': { male: 6299, female: 4099 },
    yearly: { male: 11499, female: 8399 }
  };

  // Determine pricing gender based on time slot for females
  let pricingGender = gender;
  if (gender === 'female' && preferredTimeSlot && !isFemalDiscountTimeSlot(preferredTimeSlot)) {
    // Female selected time slot outside 10 AM - 4 PM, use male pricing
    pricingGender = 'male';
  }

  const plans = {};
  const flexibleSurcharge = 500;

  Object.keys(basePrices).forEach(type => {
    const basePrice = basePrices[type][pricingGender];
    const finalPrice = mode === 'flexible' ? basePrice + flexibleSurcharge : basePrice;
    
    plans[type] = {
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Sports Plan`,
      amount: finalPrice,
      duration: type === 'monthly' ? 1 : type === 'quarterly' ? 3 : type === 'half yearly' ? 6 : 12,
      mode: mode,
      features: [
        'Access to all sports facilities',
        'Court booking privileges',
        `${mode === 'flexible' ? 'Flexible' : 'Standard'} timing options`,
        'Equipment usage',
        'Tournament participation'
      ]
    };
  });

  return plans;
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