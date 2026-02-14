const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  temple_id: { type: String, required: true },
  name: { type: String, required: true },
  short_description: { type: String },
  long_description: { type: String },
  mobile_number: { type: String },
  image: { type: String },
  // Flattened to match your Compass Database screenshot
  address_line1: { type: String },
  address_line2: { type: String },
  landmark: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  country: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  address_url: { type: String },
  status: { type: Number, default: 1 },
  sequence: { type: Number, default: 0 },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

module.exports = mongoose.model("Donation", donationSchema);