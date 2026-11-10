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
    // club_admin manages members and fees of their own club only
    enum: ["customer", "admin", "coach", "club_admin"],
  },
  // Club the member belongs to (slug). Missing = Sathiyan, the default club, so the
  // existing members need no migration.
  club: {
    type: String,
    lowercase: true,
    trim: true,
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
    enum: ["Cricket", "Football", "Shuttle Badminton", "Functions and Events", "Body Zorb"],
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
  // Member asked for a password reset; admin sends the link over WhatsApp
  resetRequestedAt: {
    type: Date,
  },
  // Coaching programme key from Settings (badminton/football/cricket/fitness); decides the monthly fee
  coachingProgram: {
    type: String,
  },
  // Last time admin opened a WhatsApp fee reminder for this member
  feeReminderAt: {
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
userSchema.index({ club: 1, mobile: 1 });
// Note: champId index is already created by the unique: true option above

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Utility function to generate next ChampID (separate from schema).
// Sathiyan uses S25911, S25912…; partner clubs use their own prefix (e.g. MK1001) so IDs never collide.
export async function generateNextChampId(prefix = 'S'): Promise<string> {
  const start = prefix === 'S' ? 25911 : 1001;
  try {
    const pattern = new RegExp(`^${prefix}\\d+$`);
    const users = await (User as any).find({ champId: { $regex: pattern } }).select('champId').lean();
    // Compare numerically ("S100000" sorts before "S99999" as a string)
    const highest = users.reduce((max: number, u: any) => Math.max(max, parseInt(String(u.champId).slice(prefix.length), 10) || 0), 0);
    return `${prefix}${highest ? highest + 1 : start}`;
  } catch (error) {
    console.error('Error generating ChampID:', error);
    return `${prefix}${start}`; // Fallback to starting ID
  }
}

export default User;
