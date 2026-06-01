const mongoose = require("mongoose");

// We use a single-document architecture for this collection
const settingSchema = new mongoose.Schema(
  {
    ritualDiscountRate: {
      type: Number,
      default: 25, // Default 25% as per your frontend
    },
    // Future-proofing: You can easily add more global toggles here later
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    supportEmail: {
      type: String,
      default: "infosarvatirthamayi@gmail.com",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);