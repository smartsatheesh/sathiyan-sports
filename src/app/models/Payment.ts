import mongoose from "mongoose";

// One record per UPI payment proof submitted by a customer (or recorded by admin).
// The unique UTR index stops the same UPI transaction being claimed twice.
const paymentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["booking", "subscription", "tournament"],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Booking / Subscription / Player id
    reference: { type: String, default: "" }, // human-readable (booking ref, champId, tournament name)
    payerName: { type: String, default: "" },
    payerPhone: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 }, // always set by the server
    method: { type: String, enum: ["upi", "cash"], default: "upi" },
    utr: { type: String, trim: true },
    rejectedUtr: { type: String }, // kept for audit; utr is cleared on rejection so it can be resubmitted
    status: {
      type: String,
      enum: ["submitted", "confirmed", "rejected"],
      default: "submitted",
    },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

paymentSchema.index({ utr: 1 }, { unique: true, partialFilterExpression: { utr: { $type: "string" } } });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ kind: 1, refId: 1 });

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
