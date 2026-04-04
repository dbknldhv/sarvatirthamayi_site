const mongoose = require("mongoose");

const cardFavoriteTempleSchema = new mongoose.Schema({

  sql_id: Number,

  user_id: Number,

  temple_id: Number,

  purchased_member_card_id: Number,

  created_at: Date,

  updated_at: Date

}, {
  collection: "CardFavoriteTemple"
});

module.exports = mongoose.model("CardFavoriteTemple", cardFavoriteTempleSchema);