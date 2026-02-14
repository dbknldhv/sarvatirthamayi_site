const mongoose = require('mongoose');

const purchasedMemberCardSchema = new mongoose.Schema({
    sql_id: { type: Number },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // CHANGE THIS: Must match the model name "Membership" from your Membership.js
    membership_card_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    card_status: { type: Number, default: 1 }, 
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    max_visits: { type: Number, default: 1 },
    used_visits: { type: Number, default: 0 },
    payment_type: { type: Number, default: 1 },
    payment_status: { type: Number, default: 1 }, 
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String, default: null },
    payment_date: { type: Date, default: null },
    offer_id: { type: Number, default: null },
    offer_discount_amount: { type: Number, default: 0 },
    membership_card_amount: { type: Number, required: true },
    paid_amount: { type: Number, required: true },
    birthday: { type: Date, default: null },
    important_date: { type: Date, default: null },
    favorite_temples: [{ type: String }] 
}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

module.exports = mongoose.model('PurchasedMemberCard', purchasedMemberCardSchema, 'purchasedmembercards' );