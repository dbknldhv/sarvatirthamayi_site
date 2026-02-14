const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/**
 * Member Card Temples Schema
 */
const memberCardTempleSchema = new mongoose.Schema({
    sql_id: Number,
    membership_card_id: Number,
    temple_id: Number,
    max_visits: Number,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
}, { timestamps: false });

const MemberCardTemple = mongoose.model(
    'member_card_temples',
    memberCardTempleSchema,
    'member_card_temples'
);

async function startMemberCardTempleMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB (member_card_temples)');

        const sqlPath = path.join(__dirname, 'stm_club.sql'); // change if filename differs
        const content = fs.readFileSync(sqlPath, 'utf8');

        /**
         * Extract INSERT INTO member_card_temples
         */
        const regex = /INSERT INTO `member_card_temples`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) {
            throw new Error('❌ member_card_temples INSERT data not found');
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
                membership_card_id: parseInt(values[1]),
                temple_id: parseInt(values[2]),
                max_visits: parseInt(values[3]) || 1,
                created_at: values[4] ? new Date(values[4]) : null,
                updated_at: values[5] ? new Date(values[5]) : null
            };
        }).filter(Boolean);

        /**
         * Clean insert
         */
        const collection = mongoose.connection.collection('member_card_temples');
        await collection.dropIndexes().catch(() => {});
        await MemberCardTemple.deleteMany({});
        await MemberCardTemple.insertMany(records, { ordered: false });

        console.log(`🎉 Success! ${records.length} member_card_temples migrated`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Member Card Temple Migration Error:', err);
        process.exit(1);
    }
}

startMemberCardTempleMigration();
