const mongoose = require("mongoose");

const seedPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packId: { type: String, required: true, trim: true },
    packName: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    currency: { type: String, required: true, trim: true },
    amountMinor: { type: Number, required: true, min: 1 },
    baseSeeds: { type: Number, required: true, min: 1 },
    bonusPercent: { type: Number, default: 0, min: 0 },
    bonusSeeds: { type: Number, default: 0, min: 0 },
    totalSeedsCredited: { type: Number, default: 0, min: 0 },
    purchaseNumberForBonus: { type: Number, default: 0, min: 0 },
    razorpayOrderId: { type: String, required: true, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    status: {
      type: String,
      enum: ["created", "paid", "credited", "failed"],
      default: "created",
      index: true,
    },
    failureReason: { type: String, default: "", trim: true },
    creditedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

seedPurchaseSchema.index({ razorpayOrderId: 1 }, { unique: true });
seedPurchaseSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model("SeedPurchase", seedPurchaseSchema);
