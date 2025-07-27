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
  phone: {
    type: String,
    required: [true, "Phone number is required"],
  },
  gender: {
    type: String,
    required: [true, "Gender is required"],
    enum: ["male", "female", "other"],
  },
  preferredSport: {
    type: String,
    required: [true, "Preferred sport is required"],
    enum: ["Cricket", "Football", "Shuttle Badminton"],
  },
  preferredTimeSlot: {
    type: String,
    required: [true, "Preferred time slot is required"],
  },
  subscriptionType: {
    type: String,
    required: [true, "Subscription type is required"],
    enum: ["monthly", "quarterly", "yearly"],
  },
  subscriptionAmount: {
    type: Number,
    required: [true, "Subscription amount is required"],
  },
  paymentStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "completed", "failed"],
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now,
  },
  subscriptionEndDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
