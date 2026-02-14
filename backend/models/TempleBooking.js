const mongoose = require("mongoose");

const templeBookingSchema = new mongoose.Schema(
  {
    sql_id: { type: Number, unique: true },
    booking_id: { type: String, default: null },
    // References to other collections using ObjectIds
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    temple_id: { type: mongoose.Schema.Types.ObjectId, ref: "Temple", default: null },
    
    whatsapp_number: { type: String, required: true },
    devotees_name: { type: String, required: true },
    wish: { type: String, default: null },
    date: { type: Date, required: true },
    
    booking_status: { type: Number, default: 1 }, // 1: Pending, 2: Confirmed, 3: Cancelled
    payment_type: { type: Number, default: 1 },   // 1: Cash, 2: Online, 3: Card
    payment_status: { type: Number, default: 1 }, // 1: Pending, 2: Paid, 3: Failed
    
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    payment_date: { type: Date, default: null },
    
    purchased_member_card_id: { type: Number, default: null },
    
    offer_discount_amount: { type: Number, default: 0 },
    original_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    
    qr_code: { type: String, default: null },
    
    // Explicitly mapping created_at/updated_at from your SQL migration
    created_at: { type: Date },
    updated_at: { type: Date }
  },
  { 
    collection: "temple_bookings",
    // We disable automatic timestamps because we migrated existing ones, 
    // but you can enable them for new records
    timestamps: false 
  }
);

module.exports = mongoose.model("TempleBooking", templeBookingSchema);