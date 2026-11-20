import mongoose from "mongoose";

// A person Sathiyan Finance lends to. Kept separate from Users/Customers: borrowers are not
// members and never log in. `defaultRate` lets the owner give a trusted borrower their own
// interest rate; each loan still records the rate it was given at.
const borrowerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    mobile: { type: String, required: true, trim: true, index: true },
    altMobile: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "", maxlength: 300 },
    idProof: { type: String, trim: true, default: "", maxlength: 120 },
    notes: { type: String, trim: true, default: "", maxlength: 500 },
    // Optional personal rate (%): used as the default when a new loan is given to this person
    defaultRate: { type: Number, min: 0, max: 100 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

borrowerSchema.index({ name: 1 });

const Borrower = mongoose.models.Borrower || mongoose.model("Borrower", borrowerSchema);

export default Borrower;
