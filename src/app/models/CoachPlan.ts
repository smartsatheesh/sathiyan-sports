import mongoose from "mongoose";

// A member's AI training plan, their tick-offs and the conversation with the coach.
const coachPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String },
    inputs: { type: mongoose.Schema.Types.Mixed, required: true },
    plan: { type: mongoose.Schema.Types.Mixed, required: true },
    progress: { type: Map, of: Boolean, default: {} },
    chat: {
      type: [{ role: { type: String, enum: ["user", "coach"] }, text: String, at: { type: Date, default: Date.now } }],
      default: [],
    },
    // usage counters for the daily free limits
    chatDay: { type: String },
    chatCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

coachPlanSchema.index({ userId: 1, createdAt: -1 });

const CoachPlan = mongoose.models.CoachPlan || mongoose.model("CoachPlan", coachPlanSchema);

export default CoachPlan;
