const mongoose = require("mongoose");

const cardFavoriteTempleSchema = new mongoose.Schema(
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
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "cardfavoritetemples",
  }
);

cardFavoriteTempleSchema.index(
  { purchased_member_card_id: 1, temple_id: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.CardFavoriteTemple ||
  mongoose.model("CardFavoriteTemple", cardFavoriteTempleSchema);