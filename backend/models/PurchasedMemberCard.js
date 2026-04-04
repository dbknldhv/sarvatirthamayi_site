const mongoose = require("mongoose");

const purchasedMemberCardSchema = new mongoose.Schema(
  {
    sql_id: {
      type: Number,
      default: null,
      index: { unique: true, sparse: true },
    },

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

    // 0 => Inactive, 1 => Active, 2 => Expired
    card_status: {
      type: Number,
      enum: [0, 1, 2],
      default: 1,
      index: true,
    },

    start_date: {
      type: Date,
      default: null,
    },

    end_date: {
      type: Date,
      default: null,
      index: true,
    },

    max_visits: {
      type: Number,
      default: 0,
    },

    used_visits: {
      type: Number,
      default: 0,
    },

    // 1 => Cash / Old, 2 => Razorpay / Online, 3 => Membership usage
    payment_type: {
      type: Number,
      default: 2,
    },

    // 1 => Pending, 2 => Paid, 3 => Failed
    payment_status: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      index: true,
    },

    razorpay_order_id: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    razorpay_payment_id: {
      type: String,
      default: null,
      index: { unique: true, sparse: true },
    },

    razorpay_signature: {
      type: String,
      default: null,
    },

    payment_date: {
      type: Date,
      default: null,
    },

    offer_id: {
      type: Number,
      default: null,
    },

    offer_discount_amount: {
      type: Number,
      default: null,
    },

    membership_card_amount: {
      type: Number,
      default: 0,
    },

    paid_amount: {
      type: Number,
      default: 0,
    },

    birthday: {
      type: Date,
      default: null,
    },

    important_date: {
      type: Date,
      default: null,
    },

    // User-selected favorite temples inside this membership purchase
    favorite_temples: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Temple",
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "purchasedmembercards",
  }
);

purchasedMemberCardSchema.index({ user_id: 1, card_status: 1, payment_status: 1 });
purchasedMemberCardSchema.index({ user_id: 1, membership_card_id: 1 });

module.exports =
  mongoose.models.PurchasedMemberCard ||
  mongoose.model("PurchasedMemberCard", purchasedMemberCardSchema);