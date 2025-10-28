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
    enum: ["customer", "admin"],
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
  preferredSport: {
    type: String,
    enum: ["Cricket", "Football", "Shuttle Badminton", "Functions and Events"],
  },
  preferredTimeSlot: {
    type: String,
  },
  selectedCourt: {
    type: String,
    enum: ["S1", "S2", "S3"],
    required: function() {
      return this.preferredSport === "Shuttle Badminton";
    },
  },
  subscriptionType: {
    type: String,
    enum: ["monthly", "quarterly", "half yearly", "yearly"],
  },
  subscriptionAmount: {
    type: Number,
  },
  paymentStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "completed", "failed"],
    },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "verified", "rejected", "suspended"],
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
  mode: {
    type: String,
    enum: ["fixed", "flexible"],
  },
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
      { champId: { $regex: /^S259\d+$/ } },
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
