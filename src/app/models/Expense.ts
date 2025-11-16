import { Book } from "lucide-react";
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  // Original expense fields
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0, "Amount must be positive"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  paidBy: {
    type: String,
    required: [true, "Who paid is required"],
    enum: ["Satheesh", "Sasi", "Maha", "Anu"],
  },
  paymentMethod: {
    type: String,
    required: [true, "Payment method is required"],
    enum: ["cash", "gpay"],
  },
  transactionId: {
    type: String,
    required: function() {
      return this.paymentMethod === "gpay";
    },
    trim: true,
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["Badminton Subscription Fees", "Football Subscription Fees", "Cricket Subscription Fees", "Sathiyan sports", "Common", "Seimurai","Booking-Badminton","Booking-Cricket","Booking-Football","Booking-Functions and Events"],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  
  // New fee collection fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for backward compatibility
  },
  userName: {
    type: String,
    required: false, // Optional for backward compatibility
  },
  champId: {
    type: String,
    required: false, // Optional for backward compatibility
  },
  subscriptionType: {
    type: String,
    enum: ["monthly", "quarterly", "half yearly", "yearly"],
    required: false, // Optional for backward compatibility
  },
  sport: {
    type: String,
    enum: ["Badminton", "Football", "Cricket"],
    required: false, // Optional for backward compatibility
  },
  paymentDate: {
    type: Date,
    required: false, // Optional for backward compatibility
  },
  status: {
    type: String,
    enum: ["paid", "pending", "overdue"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

// Add indexes for performance
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ createdAt: -1 });
// New indexes for fee collection
expenseSchema.index({ userId: 1, createdAt: -1 });
expenseSchema.index({ sport: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ paymentDate: -1 });
expenseSchema.index({ champId: 1 });

// Update timestamp on save
expenseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);

export default Expense;