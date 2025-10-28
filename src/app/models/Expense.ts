import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
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
    enum: ["Sathiyan sports", "Common", "Seimurai"],
  },
  date: {
    type: Date,
    default: Date.now,
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

// Update timestamp on save
expenseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);

export default Expense;