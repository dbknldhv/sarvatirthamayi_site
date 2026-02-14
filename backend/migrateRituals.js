const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/* ================= MONGODB ================= */
mongoose
  .connect("mongodb://127.0.0.1:27017/stm_club")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB error", err); process.exit(1); });

/* ================= SCHEMAS ================= */
// We need the Temple model to look up the new ObjectIds
const Temple = mongoose.model("Temple", new mongoose.Schema({
  sql_id: Number,
  name: String
}));

const ritualSchema = new mongoose.Schema({
  // Note: We REMOVED _id: Number to let MongoDB use ObjectIds
  temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple' },
  name: String,
  status: Number,
  description: String,
  sequence: Number,
  ritual_type_id: mongoose.Schema.Types.Mixed, // Temporary until types are migrated
  image: String,
  sql_id: Number, // Storing old SQL ID here
  created_at: Date,
  updated_at: Date
});

const Ritual = mongoose.model("Ritual", ritualSchema);

/* ================= MIGRATION ================= */
/* ================= IMPROVED MIGRATION LOGIC ================= */
async function migrateRituals() {
  try {
    const temples = await Temple.find({}, 'sql_id _id').lean();
    const templeMap = {};
    temples.forEach(t => { if(t.sql_id) templeMap[t.sql_id] = t._id; });

    const sql = fs.readFileSync(path.join(__dirname, "stm_club.sql"), "utf8");
    
    // NEW REGEX: Handles "INSERT INTO `rituals` (`col1`...) VALUES (...)"
    const regex = /INSERT INTO `rituals`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/g;
    
    let match;
    const operations = [];
    let skipped = 0;

    while ((match = regex.exec(sql)) !== null) {
      const rows = match[1].split(/\),\s*\(/);

      for (let row of rows) {
        row = row.trim().replace(/^\(|\)$/g, "");
        
        // Better value extraction
        const values = row.match(/NULL|'([^'\\]*(?:\\.[^'\\]*)*)'|(\d+)/g)?.map(v => {
          v = v.trim();
          if (v === "NULL") return null;
          return v.startsWith("'") ? v.slice(1, -1).replace(/\\'/g, "'") : v;
        });

        if (!values || values.length < 10) { skipped++; continue; }

        const oldSqlId = Number(values[0]);
        const oldTempleId = Number(values[1]);
        const newTempleId = templeMap[oldTempleId];

        if (!newTempleId) {
          console.warn(`⚠️ Skipping Ritual ${values[2]}: Temple SQL ID ${oldTempleId} not found`);
          skipped++;
          continue;
        }

        operations.push({
          updateOne: {
            filter: { sql_id: oldSqlId },
            update: { $set: {
              temple_id: newTempleId,
              name: values[2],
              status: Number(values[3]),
              description: values[4],
              sequence: Number(values[5]),
              ritual_type_id: values[6] ? Number(values[6]) : null,
              image: values[7],
              sql_id: oldSqlId,
              created_at: values[8] ? new Date(values[8]) : new Date(),
              updated_at: values[9] ? new Date(values[9]) : new Date()
            }},
            upsert: true
          }
        });
      }
    }

    if (operations.length) {
      await Ritual.bulkWrite(operations);
    }

    console.log(`🎉 Success! Rituals Migrated: ${operations.length} | Skipped: ${skipped}`);
  } catch (err) {
    console.error("❌ Migration failed", err);
  } finally {
    process.exit(0);
  }
}

migrateRituals();

