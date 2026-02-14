const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  // REMOVED unique: true to allow new cards without a SQL ID
  sql_id: { 
    type: Number, 
    sparse: true 
  }, 
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  visits: { 
    type: Number, 
    default: 0 
  },
  price: { 
    type: Number, 
    default: 0.00 
  },
  duration: { 
    type: Number, 
    default: 1 
  },
  // 1 => Months, 2 => Years
  duration_type: { 
    type: Number, 
    enum: [1, 2], 
    default: 1 
  }, 
  // 0 => Inactive, 1 => Active
  status: { 
    type: Number, 
    enum: [0, 1], 
    default: 1 
  },
  // Supporting multiple temples per membership card
  temples: [{
    templeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Temple' 
    },
    name: { 
      type: String 
    }, 
    maxVisits: { 
      type: Number, 
      default: 1 
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Membership", membershipSchema);