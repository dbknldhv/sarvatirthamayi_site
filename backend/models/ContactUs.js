const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema(
  {
    sql_id: { type: Number, index: true, unique: true, sparse: true },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    mobile_number: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    message: { type: String, default: null },
  },
  {
    collection: "contact_us",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports =
  mongoose.models.ContactUs || mongoose.model("ContactUs", contactUsSchema);