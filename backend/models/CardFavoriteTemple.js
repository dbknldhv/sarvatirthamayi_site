const mongoose = require("mongoose");

const cardFavoriteTempleSchema = new mongoose.Schema(
  {
    sql_id: { type: Number, default: null, index: true, sparse: true },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    temple_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
      index: true,
    },

    purchased_member_card_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchasedMemberCard",
      required: true,
      index: true,
    },

    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null },
  },
  {
    collection: "CardFavoriteTemple",
    timestamps: false,
  }
);

module.exports =
  mongoose.models.CardFavoriteTemple ||
  mongoose.model("CardFavoriteTemple", cardFavoriteTempleSchema);