import mongoose, { Document, Schema } from 'mongoose';

/**
 * One record per booking customer, keyed by their 10-digit mobile. Created and refreshed
 * automatically whenever a booking is made (lib/customers.server.ts), so the desk can prefill
 * a returning customer's details and the owner can see who books most, run offers and show
 * the week's booking champs on the home page.
 */
export interface ICustomer extends Document {
  mobile: string; // 10 digits, no country code
  name: string;
  email: string;
  photo?: string; // small JPEG data URL set by the admin (not selected by default)
  showOnLeaderboard: boolean; // may appear in "booking champs of the week"
  notes: string;
  // Denormalised from the bookings collection (syncCustomers recomputes them)
  bookingCount: number;
  firstBookingAt?: Date;
  lastBookingAt?: Date;
  favouriteSport?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    mobile: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    photo: { type: String, select: false },
    showOnLeaderboard: { type: Boolean, default: true },
    notes: { type: String, default: '', maxlength: 500 },
    bookingCount: { type: Number, default: 0 },
    firstBookingAt: { type: Date },
    lastBookingAt: { type: Date },
    favouriteSport: { type: String },
  },
  { timestamps: true }
);

CustomerSchema.index({ bookingCount: -1 });

if (mongoose.models.Customer) {
  delete (mongoose.models as any).Customer;
}
export default mongoose.model<ICustomer>('Customer', CustomerSchema);
