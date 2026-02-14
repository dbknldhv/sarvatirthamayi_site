const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

const stateSchema = new mongoose.Schema({
    sql_id: Number,
    name: String,
    country_id: Number,
    status: Number,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
});

const State = mongoose.model('State', stateSchema);

async function startStateMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB for State Migration...");

        const sqlPath = path.join(__dirname, 'stm_club (1).sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        // Extract the block inside INSERT INTO `states`
        const regex = /INSERT INTO `states` [^*]*? VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) throw new Error("Could not find state data in SQL file.");

        // Split by "), (" to get individual rows
        // We use a more robust split to avoid trailing characters
        const rows = match[1].trim().split(/\),\s*\(/);

        const formatted = rows.map((row, index) => {
            // Clean the row: remove leading '(' or trailing ')' if they exist from the split
            let cleanRow = row.trim();
            if (cleanRow.startsWith('(')) cleanRow = cleanRow.substring(1);
            if (cleanRow.endsWith(')')) cleanRow = cleanRow.substring(0, cleanRow.length - 1);

            // Improved value extraction
            const values = cleanRow.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g).map(v => {
                let val = v.trim();
                if (val === 'NULL') return null;
                return val.startsWith("'") ? val.slice(1, -1) : val;
            });

            // Added validation to prevent NaN errors
            const sqlId = parseInt(values[0]);
            const countryId = parseInt(values[2]);

            if (isNaN(sqlId) || isNaN(countryId)) {
                console.warn(`Skipping invalid row at index ${index}: ${cleanRow}`);
                return null;
            }

            return {
                sql_id: sqlId,
                name: values[1],
                country_id: countryId,
                status: parseInt(values[3]) || 1,
                created_at: values[4] && values[4] !== 'NULL' ? new Date(values[4]) : null,
                updated_at: values[5] && values[5] !== 'NULL' ? new Date(values[5]) : null
            };
        }).filter(item => item !== null); // Remove any skipped null rows

        await State.deleteMany({}); 
        await State.insertMany(formatted);
        
        console.log(`✅ Success! ${formatted.length} states migrated.`);
        process.exit();

    } catch (err) {
        console.error("State Migration Error:", err);
        process.exit(1);
    }
}

startStateMigration();