const mongoose = require('mongoose');

const templeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sql_id: { type: Number, index: true },
  user_id: { type: Number }, 
  status: { type: Number, default: 1 },
  short_description: String,
  long_description: String,
  mobile_number: String,
  email: String,
  open_time: String,
  close_time: String,
  visit_price: { type: Number, default: 0 },
  
  // --- NEW: Admin Discount Controls ---
  is_free_today: { type: Boolean, default: false }, // Admin "Free Entry" Toggle
  is_discount_active: { type: Boolean, default: false }, // Toggle for any discounts
  member_discount_percentage: { type: Number, default: 25 }, // Default for Club Members
  special_discount_percentage: { type: Number, default: 0 }, // For flash sales
  
  address_line1: String,
  address_line2: String,
  landmark: String,
  country_name: String,
  state_name: String,
  city_name: String,
  country_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  city_id: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  pincode: String,
  latitude: Number, 
  longitude: Number, 
  address_url: String,
  sequence: Number,
  trading_sequence: Number,
  image: String, 

  admin_first_name: String,
  admin_last_name: String,
  admin_email: String,
  admin_mobile: String,
  admin_password: String 
}, { timestamps: true });

templeSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Temple', templeSchema);