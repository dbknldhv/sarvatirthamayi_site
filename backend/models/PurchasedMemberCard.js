const mongoose = require("mongoose");

const purchasedMemberCardSchema = new mongoose.Schema({
  sql_id: { type: Number, index: true },

  user_id: { type: Number, required: true },

  membership_card_id: { type: Number, required: true },

  card_status: { type: Number, default: 0 },

  start_date: { type: Date, default: null },

  end_date: { type: Date, default: null },

  max_visits: { type: Number, default: 0 },

  used_visits: { type: Number, default: 0 },

  payment_type: { type: Number, default: 1 },

  payment_status: { type: Number, default: 1 },

  razorpay_order_id: { type: String },

  razorpay_payment_id: { type: String },

  payment_date: { type: Date },

  offer_id: { type: Number },

  offer_discount_amount: { type: Number },

  membership_card_amount: { type: Number },

  paid_amount: { type: Number },

  birthday: { type: Date },

  important_date: { type: Date },

  created_at: { type: Date },

  updated_at: { type: Date }

}, {
  collection: "PurchasedMemberCard"
});

module.exports = mongoose.model("PurchasedMemberCard", purchasedMemberCardSchema);