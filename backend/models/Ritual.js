const mongoose = require('mongoose');

const ritualSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  status: { type: Number, default: 1 },
  sequence: { type: Number, default: 0 },
  
  // Now standard ObjectId for seamless relationship handling
  temple_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Temple', 
    required: true 
  },
  
  ritual_type_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RitualType', 
    default: null 
  },
  
  image: String,
  sql_id: { type: Number, index: true } // Preserved for reference
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

module.exports = mongoose.model('Ritual', ritualSchema);