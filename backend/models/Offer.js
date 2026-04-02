// models/Offer.js
const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    sql_id: {
      type: Number,
      index: true,
    },
    temple_id: {
      type: Number,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    discount_percentage: {
      type: Number,
      default: null,
    },
    discount_amount: {
      type: Number,
      default: null,
    },
    type: {
      type: Number,
      required: true,
      // Example:
      // 2 = Ritual
      // 3 = Event
      // 5 = Donation
    },
    reference_id: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: Number,
      default: 1,
      index: true,
    },
    sequence: {
      type: Number,
      default: 0,
      index: true,
    },
    image: {
      type: String,
      default: "",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "offers",
    versionKey: false,
  }
);

offerSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.models.Offer || mongoose.model("Offer", offerSchema);