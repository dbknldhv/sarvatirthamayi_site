const mongoose = require("mongoose");

const ritualPackageSchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  ritual_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual', required: true },
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple', required: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  devotees_count: { type: Number, default: 1 },
  price: { type: Number, required: true },
  status: { type: Number, default: 1 }, // 1: Active, 0: Inactive
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false 
});

module.exports = mongoose.model("RitualPackage", ritualPackageSchema);