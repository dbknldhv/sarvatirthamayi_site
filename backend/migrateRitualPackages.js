const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/* ================= MONGODB CONNECTION ================= */
mongoose.connect("mongodb://127.0.0.1:27017/stm_club")
  .then(() => console.log("✅ MongoDB connected for Ritual Packages Migration"))
  .catch(err => { console.error("❌ MongoDB error", err); process.exit(1); });

/* ================= SCHEMAS ================= */
// Required to map the SQL ritual_id to MongoDB ObjectId
const Ritual = mongoose.model("Ritual", new mongoose.Schema({
  sql_id: Number,
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple' }
}));

const RitualPackage = mongoose.model("RitualPackage", new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  ritual_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ritual' },
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple' }, 
  name: String,
  description: String,
  devotees_count: Number,
  price: Number,
  status: Number,
  created_at: Date,
  updated_at: Date
}, { versionKey: false }));

/* ================= MIGRATION LOGIC ================= */
async function migrateRitualPackages() {
  try {
    // 1. Fetch all Rituals to create a lookup map
    const rituals = await Ritual.find({}, 'sql_id _id temple_id').lean();
    const ritualMap = {};
    rituals.forEach(r => {
      if (r.sql_id) ritualMap[r.sql_id] = { 
        ritualObjectId: r._id, 
        templeObjectId: r.temple_id 
      };
    });

    // 2. Read the SQL file
    const sqlPath = path.join(__dirname, "stm_club.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // 3. Extract the VALUES block specifically for ritual_packages
    const regex = /INSERT INTO `ritual_packages`[\s\S]*?VALUES\s*([\s\S]*?);/g;
    let rows = [];
    let match;

    while ((match = regex.exec(sql)) !== null) {
      const block = match[1].trim().replace(/^\(/, "").replace(/\)$/, "").split(/\),\s*\(/);
      rows.push(...block);
    }

    const operations = [];
    let skipped = 0;

    for (const row of rows) {
      // Improved parsing to handle quotes, NULLs, and decimals
      const values = row.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)?.map(v => {
        v = v.trim();
        if (v === "NULL") return null;
        return v.startsWith("'") ? v.slice(1, -1) : v;
      });

      if (!values || values.length < 9) { skipped++; continue; }

      const oldPackageSqlId = Number(values[0]);
      const oldRitualSqlId = Number(values[1]);
      
      // 4. Lookup MongoDB IDs
      const mappedData = ritualMap[oldRitualSqlId];

      if (!mappedData) {
        console.warn(`⚠️ Ritual SQL ID ${oldRitualSqlId} not found. Skipping Package ${oldPackageSqlId}.`);
        skipped++;
        continue;
      }

      const doc = {
        sql_id: oldPackageSqlId,
        ritual_id: mappedData.ritualObjectId,
        temple_id: mappedData.templeObjectId, // Links package to temple via the ritual relation
        name: values[2],
        description: values[3],
        devotees_count: Number(values[4]),
        price: parseFloat(values[5]),
        status: Number(values[6]),
        created_at: values[7] ? new Date(values[7]) : new Date(),
        updated_at: values[8] ? new Date(values[8]) : new Date()
      };

      operations.push({
        updateOne: {
          filter: { sql_id: oldPackageSqlId },
          update: { $set: doc },
          upsert: true
        }
      });
    }

    // 5. Execute Bulk Write
    if (operations.length > 0) {
      await RitualPackage.bulkWrite(operations);
      console.log(`🎉 Success! Migrated: ${operations.length} | Skipped: ${skipped}`);
    } else {
      console.log("Empty data or no matches found.");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrateRitualPackages();