const mongoose = require('mongoose');

const UserDonationSchema = new mongoose.Schema({
    _id: { type: Number }, 
    devotees_name: { type: String, required: true },
    whatsapp_number: { type: String },
    donation_id: { type: Number, ref: 'Donation' },
    temple_id: { type: Number, ref: 'Temple' },
    user_id: { type: Number, ref: 'User' },
    paid_amount: { type: Number },
    payment_status: { type: Number },
    payment_date: { type: Date },
    wish: { type: String }
}, { 
    collection: 'userdonations', 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('UserDonation', UserDonationSchema);