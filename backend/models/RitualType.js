const mongoose = require('mongoose');

const RitualTypeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  status: { 
    type: Number, 
    default: 1 
  },
  sql_id: { 
    type: Number 
  }
}, { 
  collection: 'ritual_types', // This MUST match the name in MongoDB Compass
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

module.exports = mongoose.model('RitualType', RitualTypeSchema);