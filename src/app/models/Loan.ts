import mongoose from "mongoose";
import { FREQUENCIES } from "../lib/finance";

// One loan given by Sathiyan Finance. The maths (what is due, arrears, penalty) lives in
// lib/finance.ts; this document stores the terms and the running totals, which
// lib/finance.server.ts keeps in step with the LoanEntry ledger.
//   installment: principal + flat interest % collected as `installments` × `installmentAmount`
//   interest:    `interestPercent` % of the outstanding principal due every period
// Dates are IST calendar days as "YYYY-MM-DD" strings so the schedule is timezone-proof.
const loanSchema = new mongoose.Schema(
  {
    loanNo: { type: String, required: true, unique: true }, // SF-0001
    borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: "Borrower", required: true, index: true },
    borrowerName: { type: String, required: true, trim: true },
    borrowerMobile: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["installment", "interest"], required: true },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    principal: { type: Number, required: true, min: 1 },
    interestPercent: { type: Number, required: true, min: 0, max: 100 },
    installments: { type: Number, min: 1 },
    installmentAmount: { type: Number, min: 1 },
    totalRepayable: { type: Number, min: 0 },
    givenOn: { type: String, required: true }, // YYYY-MM-DD
    firstDueOn: { type: String, required: true }, // YYYY-MM-DD
    notes: { type: String, trim: true, default: "", maxlength: 500 },
    status: { type: String, enum: ["active", "closed"], default: "active", index: true },
    closedOn: { type: String },
    closedNote: { type: String, trim: true, default: "" },
    // Running totals from the ledger
    collectedTotal: { type: Number, default: 0 },
    interestTotal: { type: Number, default: 0 },
    principalReturned: { type: Number, default: 0 },
    penaltyTotal: { type: Number, default: 0 },
    lastEntryOn: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

loanSchema.index({ status: 1, givenOn: -1 });

const Loan = mongoose.models.Loan || mongoose.model("Loan", loanSchema);

export default Loan;
