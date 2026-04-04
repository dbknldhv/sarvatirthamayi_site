const mongoose = require("mongoose");

const purchasedMemberCardSchema = new mongoose.Schema(
  {
    sql_id: { type: Number, default: null, index: true, sparse: true },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    membership_card_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
      index: true,
    },

    card_status: {
      type: Number,
      enum: [0, 1, 2], // 0 inactive, 1 active, 2 expired
      default: 0,
    },

    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },

    max_visits: { type: Number, default: 0 },
    used_visits: { type: Number, default: 0 },

    payment_type: { type: Number, default: 1 },
    payment_status: { type: Number, default: 1 },

    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    payment_date: { type: Date, default: null },

    offer_id: { type: Number, default: null },
    offer_discount_amount: { type: Number, default: null },

    membership_card_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },

    birthday: { type: Date, default: null },
    important_date: { type: Date, default: null },

    favorite_temples: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Temple",
      },
    ],

    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null },
  },
  {
    collection: "PurchasedMemberCard",
    timestamps: false,
  }
);

module.exports =
  mongoose.models.PurchasedMemberCard ||
  mongoose.model("PurchasedMemberCard", purchasedMemberCardSchema);