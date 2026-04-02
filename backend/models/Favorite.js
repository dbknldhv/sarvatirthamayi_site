const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    sql_id: {
      type: mongoose.Schema.Types.Mixed,
      requried: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reference_id: {
      type: Number,
      required: true,
      index: true,
    },
    temple_id: {
      type: Number,
      default: null,
      index: true,
    },
    type: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: Number,
      default: 1,
      index: true,
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
    collection: "favorites",
    versionKey: false,
  }
);

favoriteSchema.index(
  { user_id: 1, reference_id: 1, type: 1 },
  { unique: true }
);

favoriteSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

module.exports =
  mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);