const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGO_URI = "mongodb://127.0.0.1:27017/stm_club";

/* ================= SCHEMAS ================= */

// Full schema matching SQL: id, name, code, phone_code, status, created_at, updated_at
const countrySchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  name: String,
  code: String,
  phone_code: String,
  status: Number,
  created_at: Date,
  updated_at: Date
});

// Full schema matching SQL: id, name, country_id, status, created_at, updated_at
const stateSchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  name: String,
  country_id: Number, 
  status: Number,
  created_at: Date,
  updated_at: Date
});

// Full schema matching SQL: id, name, state_id, created_at, updated_at
const citySchema = new mongoose.Schema({
  sql_id: { type: Number, unique: true },
  name: String,
  state_id: Number,
  created_at: Date,
  updated_at: Date
});

const Country = mongoose.model("Country", countrySchema);
const State = mongoose.model("State", stateSchema);
const City = mongoose.model("City", citySchema);

/* ================= HELPER: PARSE SQL VALUES ================= */
function parseSqlRows(sql, tableName) {
  const regex = new RegExp(`INSERT INTO \`${tableName}\`[\\s\\S]*?VALUES\\s*\\(([\\s\\S]*?)\\);`, "g");
  let match;
  const allRows = [];

  while ((match = regex.exec(sql)) !== null) {
    // Split rows while respecting content inside parentheses
    const rows = match[1].split(/\),\s*\(/);
    for (let row of rows) {
      row = row.trim().replace(/^\(|\)$/g, "");
      
      // Matches: NULL, strings inside '', or numbers
      const values = row.match(/NULL|'([^'\\]*(?:\\.[^'\\]*)*)'|(\d+(\.\d+)?)/g)?.map(v => {
        v = v.trim();
        if (v === "NULL") return null;
        return v.startsWith("'") ? v.slice(1, -1).replace(/\\'/g, "'") : v;
      });
      
      if (values) allRows.push(values);
    }
  }
  return allRows;
}

/* ================= MIGRATION LOGIC ================= */
async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    const sqlPath = path.join(__dirname, "stm_club.sql");
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, "utf8");

    // 1. Migrate Countries (7 Columns)
    const countryRows = parseSqlRows(sql, "countries");
    const countryOps = countryRows.map(row => ({
      updateOne: {
        filter: { sql_id: Number(row[0]) },
        update: { $set: { 
          sql_id: Number(row[0]), 
          name: row[1], 
          code: row[2], 
          phone_code: row[3], 
          status: row[4] ? Number(row[4]) : 0,
          created_at: row[5] ? new Date(row[5]) : null,
          updated_at: row[6] ? new Date(row[6]) : null
        } },
        upsert: true
      }
    }));
    if (countryOps.length > 0) await Country.bulkWrite(countryOps);
    console.log(`🌍 Migrated ${countryOps.length} Countries`);

    // 2. Migrate States (6 Columns)
    const stateRows = parseSqlRows(sql, "states");
    const stateOps = stateRows.map(row => ({
      updateOne: {
        filter: { sql_id: Number(row[0]) },
        update: { $set: { 
          sql_id: Number(row[0]), 
          name: row[1], 
          country_id: Number(row[2]), 
          status: row[3] ? Number(row[3]) : 1,
          created_at: row[4] ? new Date(row[4]) : null,
          updated_at: row[5] ? new Date(row[5]) : null
        } },
        upsert: true
      }
    }));
    if (stateOps.length > 0) await State.bulkWrite(stateOps);
    console.log(`🏘️ Migrated ${stateOps.length} States`);

    // 3. Migrate Cities (5 Columns)
    const cityRows = parseSqlRows(sql, "cities");
    const cityOps = cityRows.map(row => ({
      updateOne: {
        filter: { sql_id: Number(row[0]) },
        update: { $set: { 
          sql_id: Number(row[0]), 
          name: row[1], 
          state_id: Number(row[2]),
          created_at: row[3] ? new Date(row[3]) : null,
          updated_at: row[4] ? new Date(row[4]) : null
        } },
        upsert: true
      }
    }));
    if (cityOps.length > 0) await City.bulkWrite(cityOps);
    console.log(`🏙️ Migrated ${cityOps.length} Cities`);

    console.log("🏁 Full Geo-Data Migration Complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed", err);
    process.exit(1);
  }
}

runMigration();