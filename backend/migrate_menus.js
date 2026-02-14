const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/**
 * Menu Schema
 */
const menuSchema = new mongoose.Schema({
    sql_id: Number,
    title: String,
    slug: String,
    urls: mongoose.Schema.Types.Mixed,
    status: Number,
    parent_id: Number,
    order: Number,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
}, { timestamps: false });

const Menu = mongoose.model(
    'menus',
    menuSchema,
    'menus'
);

async function startMenuMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB (menus)');

        const sqlPath = path.join(__dirname, 'stm_club.sql'); // adjust if needed
        const content = fs.readFileSync(sqlPath, 'utf8');

        /**
         * Extract INSERT INTO menus
         */
        const regex = /INSERT INTO `menus`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) {
            throw new Error('❌ menus INSERT data not found');
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

            // Parse JSON urls safely
            let urls = null;
            try {
                urls = values[3] ? JSON.parse(values[3]) : null;
            } catch (e) {
                urls = null;
            }

            return {
                sql_id: sqlId,
                title: values[1],
                slug: values[2],
                urls: urls,
                status: parseInt(values[4]) || 1,
                parent_id: values[5] ? parseInt(values[5]) : null,
                order: parseInt(values[6]) || 0,
                created_at: values[7] ? new Date(values[7]) : null,
                updated_at: values[8] ? new Date(values[8]) : null
            };
        }).filter(Boolean);

        /**
         * Clean insert
         */
        const collection = mongoose.connection.collection('menus');
        await collection.dropIndexes().catch(() => {});
        await Menu.deleteMany({});
        await Menu.insertMany(records, { ordered: false });

        console.log(`🎉 Success! ${records.length} menus migrated`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Menu Migration Error:', err);
        process.exit(1);
    }
}

startMenuMigration();
