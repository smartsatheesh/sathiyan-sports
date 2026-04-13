import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  champId: {
    type: String,
    required: [true, "ChampID is required"],
    unique: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    // Removed unique constraint to allow siblings to share email
  },
  mobile: {
    type: String,
    required: [true, "Mobile number is required"],
    // Removed unique constraint to allow same mobile for multiple kids
  },
  phone: {
    type: String,
    // Keep for backward compatibility, but mobile is primary
  },
  password: {
    type: String,
    // Required only for custom login, not for social logins
  },
  role: {
    type: String,
    default: "customer",
    enum: ["customer", "admin", "coach"],
  },
  provider: {
    type: String,
    enum: ["google", "facebook", "credentials"],
  },
  providerId: {
    type: String,
  },
  image: {
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  mobileVerified: {
    type: Boolean,
    default: false,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  champType: {
    type: String,
    enum: ["kids", "adult", "veteran"],
    required: [true, "Champion type is required"],
  },
  subscribed: {
    type: String,
    enum: ["yes", "no"],
    default: "no",
    required: [true, "Subscription status is required"],
  },
  preferredSport: {
    type: String,
    enum: ["Cricket", "Football", "Shuttle Badminton", "Functions and Events"],
  },
  preferredTimeSlot: {
    type: String,
  },
  selectedCourt: {
    type: String,
    enum: {
      values: ["S1", "S2", "S3"],
      message: "Selected court must be one of: S1, S2, S3"
    },
    required: function() {
      return this.preferredSport === "Shuttle Badminton";
    },
    validate: {
      validator: function(value) {
        // Only validate enum for badminton players
        if (this.preferredSport === "Shuttle Badminton") {
          return !value || ["S1", "S2", "S3"].includes(value);
        }
        // For other sports, allow any value or no value
        return true;
      },
      message: "Court selection is only required for Shuttle Badminton players"
    }
  },
  subscriptionType: {
    type: String,
    enum: ["monthly", "quarterly", "half yearly", "yearly"],
  },
  mode: {
    type: String,
    enum: ["fixed", "flexible"],
    default: "fixed",
  },
  subscriptionAmount: {
    type: Number,
  },
  paymentStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "completed", "failed", "overdue"],
  },
  // Enhanced payment tracking fields
  paymentCompletedDate: {
    type: Date,
  },
  nextDueDate: {
    type: Date,
  },
  billingCycleLength: {
    type: Number, // For flexible months (1-5 for monthly)
    default: 1,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "gpay", "phonepe", "bank_transfer", "whatsapp"],
  },
  transactionId: {
    type: String,
  },
  paymentHistory: [{
    paymentDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    transactionId: { type: String },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    status: { type: String, enum: ["completed", "failed", "pending"], required: true }
  }],
  overdueDays: {
    type: Number,
    default: 0,
  },
  gracePeriodDays: {
    type: Number,
    default: 5, // 5 days grace period
  },
  verifiedAt: {
    type: Date,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  subscriptionStartDate: {
    type: Date,
  },
  subscriptionEndDate: {
    type: Date,
  },
  hasActiveSubscription: {
    type: Boolean,
    default: false,
  },
  lastSubscriptionDate: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  // New fields for registration
  comments: {
    type: String,
  },
  height: {
    type: Number,
    // Optional field for user height in cm
  },
  weight: {
    type: Number,
    // Optional field for user weight in kg
  },
  bmi: {
    type: Number,
    // Optional field for BMI (calculated from height and weight)
  },
  // Registered slots for monthly/yearly subscribers (blocks slots for regular bookings)
  registeredSlots: [{
    _id: mongoose.Schema.Types.ObjectId,
    timeSlot: {
      type: String,
      required: true,
    },
    court: {
      type: String,
      enum: ["S1", "S2", "S3"],
      default: "S1",
    },
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for performance (only champId has unique constraint now)
userSchema.index({ role: 1 });
// Note: champId index is already created by the unique: true option above

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Utility function to generate next ChampID (separate from schema)
export async function generateNextChampId(): Promise<string> {
  try {
    const lastUser = await (User as any).findOne(
      { champId: { $regex: /^S\d+$/ } },
      {},
      { sort: { champId: -1 } }
    );
    
    if (!lastUser || !lastUser.champId) {
      return 'S25911'; // Starting ChampID
    }
    
    const lastNumber = parseInt(lastUser.champId.substring(1)); // Remove 'S' prefix
    const nextNumber = lastNumber + 1;
    return `S${nextNumber}`;
  } catch (error) {
    console.error('Error generating ChampID:', error);
    return 'S25911'; // Fallback to starting ID
  }
}

export default User;
