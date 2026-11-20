import mongoose from "mongoose";

// The Sathiyan Finance ledger: every rupee given or received, one row each.
//   given       money handed to the borrower (created with the loan)
//   collection  an instalment on a thavanai loan (`interestPart` = its interest share)
//   interest    interest received on an interest-only loan
//   principal   principal returned on an interest-only loan
//   penalty     a late penalty collected
// Finance staff add rows; only the owner can delete one (the loan totals are recomputed).
const loanEntrySchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true, index: true },
    borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: "Borrower", required: true },
    kind: { type: String, enum: ["given", "collection", "interest", "principal", "penalty"], required: true },
    amount: { type: Number, required: true, min: 1 },
    interestPart: { type: Number, default: 0 },
    date: { type: String, required: true }, // YYYY-MM-DD (IST)
    month: { type: String, required: true, index: true }, // YYYY-MM, for the reports
    method: { type: String, enum: ["cash", "upi"], default: "cash" },
    note: { type: String, trim: true, default: "", maxlength: 200 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recordedByName: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

loanEntrySchema.index({ loanId: 1, date: -1 });
loanEntrySchema.index({ month: 1, kind: 1 });

const LoanEntry = mongoose.models.LoanEntry || mongoose.model("LoanEntry", loanEntrySchema);

export default LoanEntry;
