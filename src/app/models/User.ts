import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  mobile: {
    type: String,
    required: [true, "Mobile number is required"],
    unique: true,
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
  subscriptionType: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for role only (email and mobile already indexed via unique: true)
userSchema.index({ role: 1 });

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
