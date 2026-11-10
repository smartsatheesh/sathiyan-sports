import mongoose from "mongoose";

// A partner club that uses the app for its own memberships and fee collection.
// Sathiyan (the owner's club) is the built-in default and has no document here — its
// prices, UPI ID and WhatsApp number come from the site Settings.
const programSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    monthly: { type: Number, required: true, min: 0 }, // kids
    adultMonthly: { type: Number, min: 0 }, // adults & veterans
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]{2,40}$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 60, default: "" },
    tagline: { type: String, trim: true, maxlength: 160, default: "" },
    // Member IDs are <prefix><number>, so clubs never collide with Sathiyan's S-numbers
    champIdPrefix: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z]{2,4}$/ },
    color: { type: String, default: "#1565c0" },
    upi: {
      vpa: { type: String, trim: true, default: "" },
      payeeName: { type: String, trim: true, default: "" },
    },
    whatsappNumber: { type: String, trim: true, default: "" },
    programs: { type: [programSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Club = mongoose.models.Club || mongoose.model("Club", clubSchema);

export default Club;
