import mongoose from "mongoose";

// A real member's review. Shown on the homepage only after an admin approves it.
const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    displayName: { type: String, required: true, trim: true, maxlength: 40 }, // e.g. "Priya S."
    label: { type: String, trim: true, maxlength: 60 }, // e.g. "Badminton · member"
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ["pending", "approved", "hidden"], default: "pending" },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, updatedAt: -1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
