import mongoose from "mongoose";

// A partner club that runs its own site on <slug>.sathiyansports.in: its branding, location,
// facilities, coaching programmes and payment details. Sathiyan (the owner's club) is the
// built-in default and has no document here — its details come from the site Settings.
// Court prices and the rest of a club's SiteSettings live in the Settings collection under
// the key `club:<slug>` (see lib/settings.server.ts).
const programSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    monthly: { type: Number, required: true, min: 0 }, // kids
    adultMonthly: { type: Number, min: 0 }, // adults & veterans
  },
  { _id: false }
);

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    emoji: { type: String, trim: true, maxlength: 8, default: "🏟️" },
    description: { type: String, trim: true, maxlength: 160, default: "" },
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

    // Branding: header colour, accent (buttons/highlights) and a small logo stored as a data URL,
    // served by /api/clubs/[slug]/logo
    color: { type: String, default: "#1565c0" },
    accentColor: { type: String, default: "#ffc400" },
    logo: { type: String, select: false },
    hasLogo: { type: Boolean, default: false },

    location: {
      address: { type: String, trim: true, maxlength: 200, default: "" },
      mapUrl: { type: String, trim: true, maxlength: 300, default: "" },
    },
    contact: {
      phone: { type: String, trim: true, maxlength: 20, default: "" },
      email: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
      instagram: { type: String, trim: true, maxlength: 60, default: "" },
    },
    facilities: { type: [facilitySchema], default: [] },

    upi: {
      vpa: { type: String, trim: true, default: "" },
      payeeName: { type: String, trim: true, default: "" },
    },
    whatsappNumber: { type: String, trim: true, default: "" },
    programs: { type: [programSchema], default: [] },

    // Which parts of the app the club has switched on (the rest stay hidden on its site)
    features: {
      memberships: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      bookings: { type: Boolean, default: false },
      tournaments: { type: Boolean, default: false },
      shop: { type: Boolean, default: false },
      coach: { type: Boolean, default: false },
    },

    // Commercials: the plan the club is on and how long it's paid for (owner-managed)
    plan: { type: String, enum: ["trial", "starter", "pro"], default: "trial" },
    planPaidTill: { type: Date },
    // Optional own domain (e.g. coolclub.com) mapped to the same service
    customDomain: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Club = mongoose.models.Club || mongoose.model("Club", clubSchema);

export default Club;
