const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/* ================= MONGODB CONNECTION ================= */
mongoose.connect("mongodb://127.0.0.1:27017/stm_club")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB error", err); process.exit(1); });

/* ================= SCHEMAS ================= */
const User = mongoose.model("User", new mongoose.Schema({
  sql_id: Number, 
  first_name: String
}));

// Use a formal schema definition for the nested objects
const purchasedCardSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  membership_plan_sql_id: Number,
  card_status: Number, 
  validity: {
    start_date: { type: Date },
    end_date: { type: Date }
  },
  visits: {
    max: { type: Number, default: 1 },
    used: { type: Number, default: 0 }
  },
  // CHANGED: Explicitly defined as an object structure
  payment: {
    type: { type: Number },
    status: { type: Number },
    order_id: { type: String },
    payment_id: { type: String, default: null },
    date: { type: Date, default: null },
    membership_amount: { type: Number },
    amount_paid: { type: Number }
  },
  details: {
    birthday: { type: Date, default: null },
    important_date: { type: Date, default: null },
    favorite_temples: [{ type: String }] 
  },
  sql_id: { type: Number, unique: true },
  created_at: { type: Date },
  updated_at: { type: Date }
});

const PurchasedCard = mongoose.model("PurchasedCard", purchasedCardSchema);

/* ================= MIGRATION LOGIC ================= */
async function migrateCards() {
  try {
    console.log("⏳ Starting migration...");
    
    const users = await User.find({}, 'sql_id _id').lean();
    const userMap = {};
    users.forEach(u => { if(u.sql_id) userMap[u.sql_id] = u._id; });

    const sqlPath = path.join(__dirname, "stm_club.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    const regex = /INSERT INTO `purchased_member_cards`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/g;
    
    let match;
    const operations = [];
    let skipped = 0;

    while ((match = regex.exec(sql)) !== null) {
      const rows = match[1].split(/\),\s*\(/);

      for (let row of rows) {
        row = row.trim().replace(/^\(|\)$/g, "");
        
        const values = row.match(/NULL|'([^'\\]*(?:\\.[^'\\]*)*)'|(\d+(\.\d+)?)/g)?.map(v => {
          v = v.trim();
          if (v === "NULL") return null;
          return v.startsWith("'") ? v.slice(1, -1).replace(/\\'/g, "'") : v;
        });

        if (!values || values.length < 21) { 
            skipped++; 
            continue; 
        }

        const oldSqlId = Number(values[0]);
        const oldUserId = Number(values[1]);
        const newUserId = userMap[oldUserId];

        if (!newUserId) {
          skipped++;
          continue;
        }

        // Mapping based on your SQL structure
        const cardData = {
          user_id: newUserId,
          membership_plan_sql_id: Number(values[2]),
          card_status: Number(values[3]),
          validity: {
            start_date: values[4] ? new Date(values[4]) : null,
            end_date: values[5] ? new Date(values[5]) : null,
          },
          visits: {
            max: Number(values[6]),
            used: Number(values[7])
          },
          payment: {
            type: Number(values[8]),
            status: Number(values[9]),
            order_id: values[10],
            payment_id: values[11],
            date: values[12] ? new Date(values[12]) : null,
            membership_amount: parseFloat(values[15] || 0),
            amount_paid: parseFloat(values[16] || 0)
          },
          details: {
            birthday: values[17] ? new Date(values[17]) : null,
            important_date: values[18] ? new Date(values[18]) : null,
            favorite_temples: [] 
          },
          sql_id: oldSqlId,
          created_at: values[19] ? new Date(values[19]) : new Date(),
          updated_at: values[20] ? new Date(values[20]) : new Date()
        };

        operations.push({
          updateOne: {
            filter: { sql_id: oldSqlId },
            update: { $set: cardData },
            upsert: true
          }
        });
      }
    }

    if (operations.length) {
      const result = await PurchasedCard.bulkWrite(operations);
      console.log(`🎉 Success! Migrated: ${result.upsertedCount + result.modifiedCount} | Skipped: ${skipped}`);
    } else {
      console.log("❓ No records found.");
    }

  } catch (err) {
    console.error("❌ Migration failed", err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

migrateCards();