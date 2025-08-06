import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  sport: {
    type: String,
    required: [true, "Sport is required"],
    enum: ["Cricket", "Football", "Shuttle Badminton", "Functions and Events"],
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
  },
  timeSlots: [{
    type: String,
    required: true,
  }],
  totalAmount: {
    type: Number,
    required: [true, "Total amount is required"],
  },
  pricePerSlot: {
    type: Number,
    required: [true, "Price per slot is required"],
  },
  isWeekend: {
    type: Boolean,
    required: true,
  },
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
  },
  customerEmail: {
    type: String,
    required: [true, "Customer email is required"],
  },
  customerPhone: {
    type: String,
    required: [true, "Customer phone is required"],
  },
  // Functions and Events specific fields
  eventType: {
    type: String,
    enum: ["Corporate Event", "Wedding", "Birthday Party", "Conference", "Other"],
  },
  totalHours: {
    type: Number,
  },
  specialRequirements: {
    type: String,
  },
  paymentStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "completed", "failed", "cancelled", "expired"],
  },
  paymentMethod: {
    type: String,
    enum: ["upi", "gpay", "netbanking", "card", "wallet", "cash"],
  },
  paymentId: {
    type: String,
  },
  upiTransactionId: {
    type: String,
  },
  paymentReference: {
    type: String,
  },
  bankDetails: {
    type: String,
  },
  walletDetails: {
    type: String,
  },
  upiApp: {
    type: String,
  },
  paymentExpiry: {
    type: Date,
  },
  bookingStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "confirmed", "cancelled", "completed", "expired"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create compound index to prevent double booking
bookingSchema.index({ sport: 1, date: 1, timeSlots: 1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
export default Booking;
