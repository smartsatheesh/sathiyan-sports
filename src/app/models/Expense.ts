import mongoose from "mongoose";

// The money ledger: money spent by the academy (type "expense", the default so older records
// stay valid) and money received outside bookings/fees (type "income": reserve money, land sale,
// sponsorship…). Allowed "paidBy" names and categories are owner-editable in Admin → Settings
// (validated in the API), so they are plain strings here.
const expenseSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["expense", "income"], default: "expense" },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 200,
    },
    paidBy: { type: String, required: [true, "Who paid is required"], trim: true },
    // "gpay" is kept as the stored value for UPI so older records stay valid
    paymentMethod: { type: String, required: true, enum: ["cash", "gpay"] },
    transactionId: { type: String, trim: true },
    category: { type: String, required: [true, "Category is required"], trim: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ type: 1, date: -1 });
expenseSchema.index({ category: 1 });

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);

export default Expense;
