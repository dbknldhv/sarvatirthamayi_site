const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

// 1. Explicit Schema with your exact collection name
const purchasedTempleSchema = new mongoose.Schema({
    sql_id: Number,
    user_id: Number,
    membership_card_id: Number,
    purchased_member_card_id: Number,
    temple_id: Number,
    max_visits: Number,
    used_visit: Number,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
}, { collection: 'PurchasedMemberCardTemple' }); // Matches your renamed collection exactly

const PurchasedMemberCardTemple = mongoose.model('PurchasedMemberCardTemple', purchasedTempleSchema);

async function startMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB: stm_club");

        const sqlPath = path.join(__dirname, 'stm_club (1).sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        // 2. Locate the specific SQL table data
        const tableHeader = "INSERT INTO `purchased_member_card_temples`";
        const startIndex = content.indexOf(tableHeader);
        
        if (startIndex === -1) throw new Error("Could not find data in SQL file.");

        const valuesStart = content.indexOf("VALUES", startIndex) + 6;
        const valuesEnd = content.indexOf(";", valuesStart);
        const rawValues = content.substring(valuesStart, valuesEnd).trim();

        // 3. Parse SQL rows into JSON objects
        const rows = rawValues.split(/\),\s*\(/);

        const formatted = rows.map((row) => {
            let cleanRow = row.replace(/^\(|\)$/g, "").trim();
            const values = cleanRow.match(/NULL|'[^']*'|[^,]+/g).map(v => {
                let val = v.trim();
                if (val === 'NULL') return null;
                return val.startsWith("'") ? val.slice(1, -1) : val;
            });

            return {
                sql_id: parseInt(values[0]),
                user_id: parseInt(values[1]),
                membership_card_id: parseInt(values[2]),
                purchased_member_card_id: parseInt(values[3]),
                temple_id: parseInt(values[4]),
                max_visits: parseInt(values[5]) || 1,
                used_visit: parseInt(values[6]) || 0,
                created_at: values[7] && values[7] !== 'NULL' ? new Date(values[7]) : null,
                updated_at: values[8] && values[8] !== 'NULL' ? new Date(values[8]) : null
            };
        }).filter(item => !isNaN(item.sql_id));

        // 4. Clear existing data and insert new records
        await PurchasedMemberCardTemple.deleteMany({});
        const result = await PurchasedMemberCardTemple.insertMany(formatted);

        console.log(`✅ Migration Successful!`);
        console.log(`📊 Records Inserted: ${result.length}`);
        console.log(`📁 Target Collection: PurchasedMemberCardTemple`);
        
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Error:", err.message);
        process.exit(1);
    }
}

startMigration();