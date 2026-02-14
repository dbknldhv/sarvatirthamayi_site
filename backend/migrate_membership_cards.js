const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/**
 * Membership Card Schema
 */
const membershipCardSchema = new mongoose.Schema({
    sql_id: Number,
    name: String,
    description: String,
    visits: Number,
    price: Number,
    duration: Number,
    duration_type: Number, // 1 => Months, 2 => Years
    status: Number,        // 0 => Inactive, 1 => Active
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
}, { timestamps: false });

const MembershipCard = mongoose.model(
    'membership_cards',
    membershipCardSchema,
    'membership_cards'
);

async function startMembershipCardMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB (membership_cards)');

        const sqlPath = path.join(__dirname, 'stm_club.sql'); // change if needed
        const content = fs.readFileSync(sqlPath, 'utf8');

        /**
         * Extract INSERT INTO membership_cards
         */
        const regex = /INSERT INTO `membership_cards`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) {
            throw new Error('❌ membership_cards INSERT data not found');
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
                name: values[1],
                description: values[2],
                visits: parseInt(values[3]) || 1,
                price: parseFloat(values[4]) || 0,
                duration: parseInt(values[5]) || 1,
                duration_type: parseInt(values[6]) || 1,
                status: parseInt(values[7]) || 1,
                created_at: values[8] ? new Date(values[8]) : null,
                updated_at: values[9] ? new Date(values[9]) : null
            };
        }).filter(Boolean);

        /**
         * Clean insert
         */
        const collection = mongoose.connection.collection('membership_cards');
        await collection.dropIndexes().catch(() => {});
        await MembershipCard.deleteMany({});
        await MembershipCard.insertMany(records, { ordered: false });

        console.log(`🎉 Success! ${records.length} membership cards migrated`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Membership Card Migration Error:', err);
        process.exit(1);
    }
}

startMembershipCardMigration();
