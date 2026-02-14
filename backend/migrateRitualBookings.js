const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/* ================= SCHEMAS ================= */
// Relational Lookups
const User = mongoose.model("User", new mongoose.Schema({ sql_id: Number }));
const Temple = mongoose.model("Temple", new mongoose.Schema({ sql_id: Number }));
const Ritual = mongoose.model("Ritual", new mongoose.Schema({ sql_id: Number }));
const RitualPackage = mongoose.model("RitualPackage", new mongoose.Schema({ sql_id: Number }));

// FULL SCHEMA DEFINITION (Crucial to fix StrictModeError)
const ritualBookingSchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  booking_id: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple' },
  ritual_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual' },
  ritual_package_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RitualPackage' },
  date: Date,
  whatsapp_number: String,
  devotees_name: String,
  wish: String,
  booking_status: Number,
  payment_type: Number,
  payment_status: Number,
  razorpay_order_id: String,
  razorpay_payment_id: String,
  payment_date: Date,
  offer_id: Number,
  offer_discount_amount: Number,
  original_amount: Number,
  paid_amount: Number,
  qr_code: String,
  created_at: Date,
  updated_at: Date
}, { versionKey: false, strict: true }); // strict: true is fine as long as fields are defined above

// Check if model exists to avoid OverwriteModelError
const RitualBooking = mongoose.models.RitualBooking || mongoose.model("RitualBooking", ritualBookingSchema);

async function migrateRitualBookings() {
  try {
    // USE YOUR ACTUAL DB NAME HERE
    await mongoose.connect("mongodb://127.0.0.1:27017/stm_club");
    console.log("🚀 Connected for Full Relational Migration");

    // 1. Load ALL Lookup Maps
    const [users, temples, rituals, packages] = await Promise.all([
      User.find({}, 'sql_id _id').lean(),
      Temple.find({}, 'sql_id _id').lean(),
      Ritual.find({}, 'sql_id _id').lean(),
      RitualPackage.find({}, 'sql_id _id').lean()
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.sql_id, u._id]));
    const templeMap = Object.fromEntries(temples.map(t => [t.sql_id, t._id]));
    const ritualMap = Object.fromEntries(rituals.map(r => [r.sql_id, r._id]));
    const packageMap = Object.fromEntries(packages.map(p => [p.sql_id, p._id]));

    // 2. Read and Parse SQL
    const sqlPath = path.join(__dirname, "stm_club.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    const regex = /INSERT INTO `ritual_bookings`[\s\S]*?VALUES\s*([\s\S]*?);/g;
    
    let rows = [];
    let match;
    while ((match = regex.exec(sql)) !== null) {
      const block = match[1].trim().replace(/^\(/, "").replace(/\)$/, "").split(/\),\s*\(/);
      rows.push(...block);
    }

    const operations = [];

    for (const row of rows) {
      const values = row.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)?.map(v => {
        v = v.trim();
        if (v === "NULL") return null;
        // Strip quotes and handle escaped single quotes
        return v.startsWith("'") ? v.slice(1, -1).replace(/\\'/g, "'") : v;
      });

      if (!values || values.length < 23) continue;

      const oldBookingSqlId = Number(values[0]);

      const doc = {
        sql_id: oldBookingSqlId,
        booking_id: values[1],
        user_id: userMap[Number(values[2])] || null, 
        temple_id: templeMap[Number(values[3])] || null,
        ritual_id: ritualMap[Number(values[4])] || null,
        ritual_package_id: packageMap[Number(values[5])] || null,
        date: values[6] ? new Date(values[6]) : null,
        whatsapp_number: values[7],
        devotees_name: values[8],
        wish: values[9],
        booking_status: Number(values[10]),
        payment_type: Number(values[11]),
        payment_status: Number(values[12]),
        razorpay_order_id: values[13],
        razorpay_payment_id: values[14],
        payment_date: values[15] ? new Date(values[15]) : null,
        offer_id: values[16] ? Number(values[16]) : null,
        offer_discount_amount: parseFloat(values[17] || 0),
        original_amount: parseFloat(values[18] || 0),
        paid_amount: parseFloat(values[19] || 0),
        qr_code: values[20],
        created_at: values[21] ? new Date(values[21]) : new Date(),
        updated_at: values[22] ? new Date(values[22]) : new Date()
      };

      operations.push({
        updateOne: {
          filter: { sql_id: oldBookingSqlId },
          update: { $set: doc },
          upsert: true
        }
      });
    }

    if (operations.length > 0) {
      const result = await RitualBooking.bulkWrite(operations);
      console.log(`✅ Success! Records processed: ${operations.length}`);
      console.log(`- Upserted: ${result.upsertedCount}`);
      console.log(`- Modified: ${result.modifiedCount}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrateRitualBookings();