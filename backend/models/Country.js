const mongoose = require('mongoose');

const CountrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  phone_code: { type: String },
  status: { type: Number, default: 1 },
  created_at: { type: Date, default: null },
  updated_at: { type: Date, default: null }
}, { collection: 'countries' }); // Explicitly link to your existing collection

module.exports = mongoose.model('Country', CountrySchema);