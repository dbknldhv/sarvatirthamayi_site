const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/**
 * Offers Schema
 */
const offerSchema = new mongoose.Schema({
    sql_id: Number,
    temple_id: Number,
    name: String,
    description: String,
    discount_percentage: Number,
    discount_amount: Number,
    type: Number,
    reference_id: Number,
    status: Number,
    sequence: Number,
    image: String,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
}, { timestamps: false });

const Offer = mongoose.model('offers', offerSchema, 'offers');

async function startOfferMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB (offers)');

        const sqlPath = path.join(__dirname, 'stm_club.sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        /**
         * GLOBAL regex to capture ALL INSERT blocks
         */
        const regex = /INSERT INTO `offers`[\s\S]*?VALUES\s*([\s\S]*?);/g;

        let match;
        let allRows = [];

        while ((match = regex.exec(content)) !== null) {
            const rowsBlock = match[1]
                .trim()
                .replace(/^\(/, '')
                .replace(/\)$/, '')
                .split(/\),\s*\(/);

            allRows.push(...rowsBlock);
        }

        if (allRows.length === 0) {
            console.log('ℹ️ No offers INSERT data found — skipping');
            process.exit(0);
        }

        const records = allRows.map((row, index) => {
            let cleanRow = row.trim();

            const values = cleanRow
                .match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)
                .map(v => {
                    v = v.trim();
                    if (v === 'NULL') return null;
                    return v.startsWith("'") ? v.slice(1, -1) : v;
                });

            const sqlId = parseInt(values[0]);
            if (isNaN(sqlId)) return null;

            return {
                sql_id: sqlId,
                temple_id: parseInt(values[1]),
                name: values[2],
                description: values[3],
                discount_percentage: parseInt(values[4]) || 0,
                discount_amount: values[5] ? parseInt(values[5]) : null,
                type: parseInt(values[6]) || 2,
                reference_id: parseInt(values[7]),
                status: parseInt(values[8]) || 1,
                sequence: parseInt(values[9]) || 0,
                image: values[10],
                created_at: values[11] ? new Date(values[11]) : null,
                updated_at: values[12] ? new Date(values[12]) : null
            };
        }).filter(Boolean);

        /**
         * Ignore existing collection safely
         */
        const collection = mongoose.connection.collection('offers');
        await collection.dropIndexes().catch(() => {});
        await Offer.deleteMany({});
        await Offer.insertMany(records, { ordered: false });

        console.log(`🎉 Success! ${records.length} offers migrated`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Offer Migration Error:', err);
        process.exit(1);
    }
}

startOfferMigration();
