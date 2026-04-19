import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  sport: {
    type: String,
    required: [true, "Sport is required"],
    enum: ["Cricket", "Football", "Shuttle Badminton", "Functions and Events", "Body Zorb"],
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
  },
  timeSlots: [{
    type: String,
    required: true,
  }],
  // Court selection for Shuttle Badminton
  court: {
    type: String,
    enum: ["S1", "S2", "S3"], // Three shuttle courts
    required: false // Will be validated in application logic
  },
  totalAmount: {
    type: Number,
    required: [true, "Total amount is required"],
  },
  pricePerSlot: {
    type: Number,
    required: false, // Made optional for simplified booking flow
  },
  isWeekend: {
    type: Boolean,
    required: false, // Made optional for simplified booking flow
  },
  // User reference for authenticated bookings
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for guest bookings
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
  // Booking reference for customer communication
  bookingReference: {
    type: String,
    unique: true,
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
    enum: ["pending", "pending_verification", "paid", "failed", "refunded", "cancelled", "expired"],
  },
  paymentMethod: {
    type: String,
    enum: ["upi", "gpay", "whatsapp", "netbanking", "card", "wallet", "cash"],
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
  cancellationReason: {
    type: String,
  },
  cancellationDate: {
    type: Date,
  },
  refundAmount: {
    type: Number,
  },
  refundStatus: {
    type: String,
    enum: ["none", "pending", "processed", "failed"],
    default: "none",
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
