const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const mongoURI = "mongodb://127.0.0.1:27017/stm_club";

/* ================== Schema ================== */
const schema = new mongoose.Schema(
  {
    _id: Number, // This is the SQL 'id'
    user_id: Number,
    temple_id: Number,
    donation_id: Number,
    whatsapp_number: String,
    devotees_name: String,
    wish: String,
    payment_type: Number,
    payment_status: Number,
    razorpay_order_id: String,
    razorpay_payment_id: String,
    payment_date: Date,
    paid_amount: Number,
    created_at: Date,
    updated_at: Date,
  },
  { 
    timestamps: false,
    collection: 'userdonations' // Force collection name
  }
);

// Model name is 'UserDonation', collection name is 'user_donations'
const UserDonation = mongoose.model("UserDonation", schema);

/* ================== Helpers ================== */
function parseValue(v) {
  if (!v || v === "NULL") return null;
  // Remove single quotes from SQL strings
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  return v;
}

/* ================== Migration ================== */
async function migrate() {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected for user_donations migration");

    // Ensure the SQL file path is correct
    const sqlPath = path.join(__dirname, "stm_club.sql");
    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ SQL file not found at: ${sqlPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf8");

    // Improved regex to handle multiple rows in a single INSERT block
    const regex = /INSERT INTO `user_donations`[\s\S]*?VALUES\s*([\s\S]*?);/g;

    let match;
    let rows = [];

    while ((match = regex.exec(sql)) !== null) {
      const block = match[1].trim();
      // Split rows by the pattern "), ("
      const individualRows = block.split(/\),\s*\(/);
      rows.push(...individualRows);
    }

    if (!rows.length) {
      console.log("ℹ️ No user_donations data found in SQL file.");
      process.exit(0);
    }

    let inserted = 0;
    let errorCount = 0;

    for (let row of rows) {
      try {
        // Clean the row string (remove leading '(' and trailing ')')
        row = row.replace(/^\(/, "").replace(/\)$/, "");
        
        // Regex to split by comma but ignore commas inside quotes
        const values = row.match(/NULL|'[^']*'|[^,]+/g).map(v => v.trim());

        const idValue = Number(parseValue(values[0]));

        const doc = {
          _id: idValue, // Mapping SQL 'id' to MongoDB '_id'
          user_id: values[1] !== "NULL" ? Number(parseValue(values[1])) : null,
          temple_id: values[2] !== "NULL" ? Number(parseValue(values[2])) : null,
          donation_id: values[3] !== "NULL" ? Number(parseValue(values[3])) : null,
          whatsapp_number: parseValue(values[4]),
          devotees_name: parseValue(values[5]),
          wish: parseValue(values[6]),
          payment_type: Number(parseValue(values[7])),
          payment_status: Number(parseValue(values[8])),
          razorpay_order_id: parseValue(values[9]),
          razorpay_payment_id: parseValue(values[10]),
          payment_date: values[11] !== "NULL" ? new Date(parseValue(values[11])) : null,
          paid_amount: Number(parseValue(values[12])),
          created_at: values[13] !== "NULL" ? new Date(parseValue(values[13])) : null,
          updated_at: values[14] !== "NULL" ? new Date(parseValue(values[14])) : null,
        };

        // Use upsert to avoid duplicate errors on re-run
        await UserDonation.updateOne(
          { _id: doc._id },
          { $set: doc },
          { upsert: true }
        );

        inserted++;
      } catch (e) {
        console.error(`⚠️ Error processing row: ${row.substring(0, 50)}... | Error: ${e.message}`);
        errorCount++;
      }
    }

    console.log(`--- Migration Summary ---`);
    console.log(`🎉 Successfully Migrated: ${inserted}`);
    if (errorCount > 0) console.log(`❌ Errors/Skipped: ${errorCount}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration critical failure:", err);
    process.exit(1);
  }
}

migrate();