const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    sql_id: { type: Number }, // To keep track of the original SQL ID
    name: { type: String, required: true },
    country_id: { type: Number },
    status: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('State', stateSchema);