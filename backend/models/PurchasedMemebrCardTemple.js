const mongoose = require("mongoose");

const purchasedTempleSchema = new mongoose.Schema({

  sql_id: Number,

  user_id: Number,

  membership_card_id: Number,

  purchased_member_card_id: Number,

  temple_id: Number,

  max_visits: Number,

  used_visit: Number,

  created_at: Date,

  updated_at: Date

}, {
  collection: "PurchasedMemberCardTemple"
});

module.exports = mongoose.model("PurchasedMemberCardTemple", purchasedTempleSchema);