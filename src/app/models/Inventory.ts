import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  itemName: string;
  itemType: 'Ball' | 'Bat' | 'Cork' | 'Body Zorb';
  currentQuantity: number;
  reorderLevel: number;
  unit: string;
  description?: string;
  lastRestocked?: Date;
  lastCheckDate?: Date;
  transactions: Array<{
    _id: mongoose.Types.ObjectId;
    date: Date;
    type: 'inflow' | 'outflow';
    quantity: number;
    reason: string;
    notes?: string;
    recordedBy?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    itemName: {
      type: String,
      required: true,
      unique: true,
    },
    itemType: {
      type: String,
      enum: ['Ball', 'Bat', 'Cork', 'Body Zorb'],
      required: true,
    },
    currentQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      required: true,
      default: 10,
    },
    unit: {
      type: String,
      required: true,
      default: 'pieces',
    },
    description: {
      type: String,
      default: '',
    },
    lastRestocked: {
      type: Date,
      default: null,
    },
    lastCheckDate: {
      type: Date,
      default: null,
    },
    transactions: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ['inflow', 'outflow'],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        reason: {
          type: String,
          required: true,
        },
        notes: {
          type: String,
          default: '',
        },
        recordedBy: {
          type: String,
          default: 'Admin',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
InventorySchema.index({ itemType: 1 });
InventorySchema.index({ currentQuantity: 1 });
InventorySchema.index({ 'transactions.date': -1 });

export default mongoose.models.Inventory ||
  mongoose.model<IInventory>('Inventory', InventorySchema);
