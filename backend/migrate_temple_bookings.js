const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGO_URI = "mongodb://127.0.0.1:27017/stm_club";

/* ================= SCHEMAS ================= */

// Referencing your existing models
// Note: Ensure these models also point to the correct collection names if they were customized
const Temple = mongoose.models.Temple || mongoose.model("Temple", new mongoose.Schema({ sql_id: Number }));
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ sql_id: Number }));

const templeBookingSchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  booking_id: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple' },
  whatsapp_number: String,
  devotees_name: String,
  wish: String,
  date: Date,
  booking_status: Number, 
  payment_type: Number,   
  payment_status: Number, 
  razorpay_order_id: String,
  razorpay_payment_id: String,
  payment_date: Date,
  purchased_member_card_id: Number, 
  offer_discount_amount: Number,
  original_amount: Number,
  paid_amount: Number,
  qr_code: String,
  created_at: Date,
  updated_at: Date
});

/** * UPDATED LINE BELOW: 
 * We pass "temple_bookings" as the 3rd argument to force the collection name 
 */
const TempleBooking = mongoose.models.TempleBooking || 
                      mongoose.model("TempleBooking", templeBookingSchema, "temple_bookings");

/* ================= MIGRATION LOGIC ================= */
async function migrateBookings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected for Booking Migration");

    const sqlPath = path.join(__dirname, "stm_club.sql");
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ SQL file not found at ${sqlPath}`);
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, "utf8");

    // 1. Create Lookup Maps for Temples and Users
    console.log("🔍 Indexing Temples and Users for ID conversion...");
    const temples = await Temple.find({}, '_id sql_id');
    const users = await User.find({}, '_id sql_id');

    const templeMap = temples.reduce((map, t) => ({ ...map, [t.sql_id]: t._id }), {});
    const userMap = users.reduce((map, u) => ({ ...map, [u.sql_id]: u._id }), {});

    // 2. Regex to find INSERT INTO `temple_bookings`
    const regex = /INSERT INTO `temple_bookings`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/g;
    let match;
    let totalMigrated = 0;

    while ((match = regex.exec(sql)) !== null) {
      const rows = match[1].split(/\),\s*\(/);
      const operations = [];

      for (let row of rows) {
        row = row.trim().replace(/^\(|\)$/g, "");
        
        // Match NULL, Strings, or Numbers
        const values = row.match(/NULL|'([^'\\]*(?:\\.[^'\\]*)*)'|(\d+(\.\d+)?)/g)?.map(v => {
          v = v.trim();
          if (v === "NULL") return null;
          return v.startsWith("'") ? v.slice(1, -1).replace(/\\'/g, "'") : v;
        });

        if (!values || values.length < 21) continue;

        const oldSqlId = Number(values[0]);
        const sqlUserId = values[2] ? Number(values[2]) : null;
        const sqlTempleId = values[3] ? Number(values[3]) : null;

        const doc = {
          sql_id: oldSqlId,
          booking_id: values[1],
          user_id: userMap[sqlUserId] || null,
          temple_id: templeMap[sqlTempleId] || null,
          whatsapp_number: values[4],
          devotees_name: values[5],
          wish: values[6],
          date: values[7] ? new Date(values[7]) : null,
          booking_status: values[8] ? Number(values[8]) : 1,
          payment_type: values[9] ? Number(values[9]) : 1,
          payment_status: values[10] ? Number(values[10]) : 1,
          razorpay_order_id: values[11],
          razorpay_payment_id: values[12],
          payment_date: values[13] ? new Date(values[13]) : null,
          purchased_member_card_id: values[14] ? Number(values[14]) : null,
          offer_discount_amount: parseFloat(values[15] || 0),
          original_amount: parseFloat(values[16] || 0),
          paid_amount: parseFloat(values[17] || 0),
          qr_code: values[18],
          created_at: values[19] ? new Date(values[19]) : null,
          updated_at: values[20] ? new Date(values[20]) : null
        };

        operations.push({
          updateOne: {
            filter: { sql_id: oldSqlId },
            update: { $set: doc },
            upsert: true
          }
        });
      }

      if (operations.length > 0) {
        await TempleBooking.bulkWrite(operations);
        totalMigrated += operations.length;
      }
    }

    console.log(`🎉 Success! Migrated ${totalMigrated} Bookings into collection: "temple_bookings"`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Booking Migration failed", err);
    process.exit(1);
  }
}

migrateBookings();