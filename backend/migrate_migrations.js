const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/**
 * Migrations Schema
 */
const migrationSchema = new mongoose.Schema({
    sql_id: Number,
    migration: String,
    batch: Number
}, { timestamps: false });

const Migration = mongoose.model(
    'migrations',
    migrationSchema,
    'migrations'
);

async function startMigrationsMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB (migrations)');

        const sqlPath = path.join(__dirname, 'stm_club.sql'); // change if needed
        const content = fs.readFileSync(sqlPath, 'utf8');

        /**
         * Extract INSERT INTO migrations
         */
        const regex = /INSERT INTO `migrations`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) {
            throw new Error('❌ migrations INSERT data not found');
        }

        /**
         * Split rows
         */
        const rows = match[1].trim().split(/\),\s*\(/);

        const records = rows.map((row, index) => {
            let cleanRow = row.trim();
            if (cleanRow.startsWith('(')) cleanRow = cleanRow.slice(1);
            if (cleanRow.endsWith(')')) cleanRow = cleanRow.slice(0, -1);

            const values = cleanRow
                .match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)
                .map(v => {
                    v = v.trim();
                    if (v === 'NULL') return null;
                    return v.startsWith("'") ? v.slice(1, -1) : v;
                });

            const sqlId = parseInt(values[0]);
            if (isNaN(sqlId)) {
                console.warn(`⚠️ Skipping invalid row at index ${index}`);
                return null;
            }

            return {
                sql_id: sqlId,
                migration: values[1],
                batch: parseInt(values[2]) || 0
            };
        }).filter(Boolean);

        /**
         * Clean insert
         */
        const collection = mongoose.connection.collection('migrations');
        await collection.dropIndexes().catch(() => {});
        await Migration.deleteMany({});
        await Migration.insertMany(records, { ordered: false });

        console.log(`🎉 Success! ${records.length} migrations migrated`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Migrations Migration Error:', err);
        process.exit(1);
    }
}

startMigrationsMigration();
