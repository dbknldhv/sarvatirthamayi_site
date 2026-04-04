const mongoose = require("mongoose");

const membershipTempleSchema = new mongoose.Schema(
  {
    temple_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },
    temple_name: {
      type: String,
      default: "",
    },
    max_visits: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const membershipSchema = new mongoose.Schema(
  {
    sql_id: {
      type: Number,
      default: null,
      index: { unique: true, sparse: true },
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    visits: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      default: 0,
    },

    duration: {
      type: Number,
      default: 1,
    },

    // 1 => Months, 2 => Years
    duration_type: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },

    // 0 => Inactive, 1 => Active
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
      index: true,
    },

    // Empty array means "Any Temple"
    temples: {
      type: [membershipTempleSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "memberships",
  }
);

module.exports =
  mongoose.models.Membership ||
  mongoose.model("Membership", membershipSchema);