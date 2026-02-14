const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';
const sqlFilePath = path.join(__dirname, 'stm_club (1).sql');

/**
 * Generic schema (Flexible for all tables)
 */
const genericSchema = new mongoose.Schema({}, { strict: false });

/**
 * Parse SQL value safely
 */
function parseValue(val) {
    if (val === 'NULL') return null;

    // Remove quotes
    if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
    }

    // JSON detection
    if (
        (val.startsWith('{') && val.endsWith('}')) ||
        (val.startsWith('[') && val.endsWith(']'))
    ) {
        try {
            return JSON.parse(val.replace(/\\"/g, '"'));
        } catch {
            return val;
        }
    }

    // Number detection
    if (!isNaN(val) && val !== '') return Number(val);

    // Date detection
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        const d = new Date(val);
        if (!isNaN(d)) return d;
    }

    return val;
}

/**
 * Extract values from row
 */
function extractValues(row) {
    return row.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)
        .map(v => parseValue(v.trim()));
}

async function migrateAllTables() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        /**
         * Match ALL INSERT blocks
         */
        const insertRegex = /INSERT INTO `(\w+)`\s*\(([^)]+)\)\s*VALUES\s*((?:\([^)]+\),?\s*)+);/g;

        let match;
        let totalTables = 0;
        let totalRecords = 0;

        while ((match = insertRegex.exec(sql)) !== null) {
            const tableName = match[1];
            const columns = match[2].split(',').map(c => c.replace(/`/g, '').trim());
            const valuesBlock = match[3];

            const rows = valuesBlock
                .trim()
                .replace(/^\(/, '')
                .replace(/\)$/, '')
                .split(/\),\s*\(/);

            const records = rows.map(row => {
                const values = extractValues(row);
                const obj = {};

                columns.forEach((col, i) => {
                    if (col === 'id') {
                        obj.sql_id = values[i];
                    } else {
                        obj[col] = values[i];
                    }
                });

                return obj;
            });

            const Model = mongoose.model(
                tableName,
                genericSchema,
                tableName
            );

            await Model.deleteMany({});
            await Model.insertMany(records);

            console.log(`📦 ${tableName}: ${records.length} records migrated`);

            totalTables++;
            totalRecords += records.length;
        }

        console.log('\n🎉 MIGRATION COMPLETE');
        console.log(`🗂 Tables migrated : ${totalTables}`);
        console.log(`📄 Total records  : ${totalRecords}`);

        process.exit();

    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
}

migrateAllTables();
