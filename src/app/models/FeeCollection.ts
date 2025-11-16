import mongoose from 'mongoose';

const FeeCollectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional since we might not always have a user ID
  },
  champId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userMobile: {
    type: String,
    required: false
  },
  feeType: {
    type: String,
    required: true,
    enum: ['Monthly Fee', 'Registration Fee', 'Court Fee', 'Equipment Fee', 'Late Fee', 'Other']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'],
    required: false
  },
  transactionId: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    required: false
  },
  createdBy: {
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  updatedBy: {
    name: { type: String },
    email: { type: String }
  }
}, {
  timestamps: true
});

// Index for efficient queries
FeeCollectionSchema.index({ champId: 1, createdAt: -1 });
FeeCollectionSchema.index({ status: 1 });
FeeCollectionSchema.index({ dueDate: 1 });
FeeCollectionSchema.index({ feeType: 1 });

// Auto-update overdue status based on due date
FeeCollectionSchema.pre('find', function() {
  // Update overdue status for pending fees past due date
  const now = new Date();
  this.updateMany(
    { 
      status: 'pending',
      dueDate: { $lt: now }
    },
    { 
      $set: { status: 'overdue' }
    }
  );
});

FeeCollectionSchema.pre('findOne', function() {
  // Update overdue status for pending fees past due date
  const now = new Date();
  this.updateMany(
    { 
      status: 'pending',
      dueDate: { $lt: now }
    },
    { 
      $set: { status: 'overdue' }
    }
  );
});

const FeeCollection = mongoose.models.FeeCollection || mongoose.model('FeeCollection', FeeCollectionSchema);

export default FeeCollection;