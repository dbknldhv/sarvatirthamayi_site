const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  sql_id: Number,
  name: { type: String, required: true },
  state_id: Number,
  state: String, // Optional: for easier filtering by name
  status: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('City', citySchema);