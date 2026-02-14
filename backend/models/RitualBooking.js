const mongoose = require("mongoose");

const ritualBookingSchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  booking_id: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple' },
  ritual_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual' },
  ritual_package_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RitualPackage' },
  date: Date,
  whatsapp_number: String,
  devotees_name: String,
  wish: String,
  booking_status: { type: Number, default: 1 }, // 1: Pending, 2: Confirmed
  payment_type: { type: Number, default: 2 },   // 1: Cash, 2: Online
  payment_status: { type: Number, default: 1 }, // 1: Pending, 2: Paid
  razorpay_order_id: String,
  razorpay_payment_id: String,
  payment_date: Date,
  offer_id: Number,
  offer_discount_amount: Number,
  original_amount: Number,
  paid_amount: Number,
  qr_code: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model("RitualBooking", ritualBookingSchema);
//module.exports = mongoose.models.RitualBooking || mongoose.model("RitualBooking", ritualBookingSchema);