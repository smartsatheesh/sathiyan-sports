import mongoose from "mongoose";

// A product the academy stocks (shuttles, balls, rackets, drinks...). Products marked
// showInShop appear on the public /shop page; customers order via WhatsApp.
const stockMoveSchema = new mongoose.Schema(
  {
    change: { type: Number, required: true }, // +received / -sold or used
    reason: { type: String, trim: true, maxlength: 100 },
    by: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, trim: true, default: "General", maxlength: 40 },
    description: { type: String, trim: true, maxlength: 400 },
    price: { type: Number, min: 0, default: 0 }, // selling price; 0 = not for sale
    stock: { type: Number, default: 0 },
    lowStockAt: { type: Number, min: 0, default: 5 },
    unit: { type: String, trim: true, default: "pcs", maxlength: 20 },
    // Small compressed JPEG/PNG/WebP as a data URL; served via /api/inventory/[id]/image
    image: { type: String, select: false },
    hasImage: { type: Boolean, default: false },
    showInShop: { type: Boolean, default: true },
    history: { type: [stockMoveSchema], default: [], select: false },
  },
  { timestamps: true }
);

productSchema.index({ showInShop: 1, category: 1 });

const Inventory = mongoose.models.Inventory || mongoose.model("Inventory", productSchema);

export default Inventory;
