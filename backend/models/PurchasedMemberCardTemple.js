const mongoose = require("mongoose");

const purchasedMemberCardTempleSchema = new mongoose.Schema(
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

    purchased_member_card_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchasedMemberCard",
      required: true,
      index: true,
    },

    temple_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
      index: true,
    },

    max_visits: {
      type: Number,
      default: 1,
    },

    used_visit: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "purchasedmembercardtemples",
  }
);

purchasedMemberCardTempleSchema.index(
  { purchased_member_card_id: 1, temple_id: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.PurchasedMemberCardTemple ||
  mongoose.model("PurchasedMemberCardTemple", purchasedMemberCardTempleSchema);