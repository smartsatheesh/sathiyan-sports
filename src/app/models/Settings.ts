import mongoose from "mongoose";

// Single document (key: "site") holding owner-editable prices, UPI and WhatsApp details.
// Shape is defined by SiteSettings in lib/pricing.ts; stored loosely so new fields need no migration.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String },
  },
  { timestamps: true, minimize: false }
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export default Settings;
