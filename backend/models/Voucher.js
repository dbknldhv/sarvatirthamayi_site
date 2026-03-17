const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    // Business reference number (e.g., VCH-2026-0001)
    voucher_no: { type: String, unique: true, trim: true },

    // Admin title (e.g., "Maha Shivaratri Special")
    title: { type: String, required: true, trim: true },

    // The actual code (e.g., FESTIVAL500)
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },

    description: { type: String, default: "", trim: true },

    discount_type: { type: String, enum: ["percentage", "flat"], required: true },
    discount_value: { type: Number, required: true, min: 0 },

    // CHECKBOX LOGIC: Categories where this works
    applies_to: {
      temple: { type: Boolean, default: false },
      ritual: { type: Boolean, default: false },
      membership: { type: Boolean, default: false },
      all_services: { type: Boolean, default: false }
    },

    // USAGE LOGIC
    usage_type: { type: String, enum: ["single", "multiple"], default: "single" },
    max_total_usage: { type: Number, default: 1, min: 1 }, // Global limit
    max_usage_per_user: { type: Number, default: 1, min: 1 }, // One-time per user limit

    // TRACKING (The "One-Time" Security)
    used_count: { type: Number, default: 0 },
    used_by: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of Users who already used it

    expiry_date: { type: Date, default: null },
    status: { type: Number, enum: [0, 1], default: 1 } // 1=Active, 0=Inactive
  },
  { 
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" } 
  }
);

// Faster lookups for checkout
voucherSchema.index({ code: 1, status: 1 });

module.exports = mongoose.models.Voucher || mongoose.model("Voucher", voucherSchema);