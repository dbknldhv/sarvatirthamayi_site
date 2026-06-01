const mongoose = require("mongoose");

const purchasedMemberCardSchema = new mongoose.Schema(
  {
    sql_id: { type: Number, default: null, index: { unique: true, sparse: true } },
    // 🎯 Set required: false to support orphaned records/guests
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null, index: true },
    membership_card_id: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", required: true, index: true },
    card_status: { type: Number, enum: [0, 1, 2], default: 1, index: true },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null, index: true },
    max_visits: { type: Number, default: 0 },
    used_visits: { type: Number, default: 0 },
    payment_type: { type: Number, default: 2 },
    payment_status: { type: Number, enum: [1, 2, 3], default: 1, index: true },
    razorpay_order_id: { type: String, default: null, index: true, sparse: true },
    razorpay_payment_id: { type: String, default: null, index: { unique: true, sparse: true } },
    paid_amount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, collection: "purchasedmembercards" }
);

module.exports = mongoose.models.PurchasedMemberCard || mongoose.model("PurchasedMemberCard", purchasedMemberCardSchema);