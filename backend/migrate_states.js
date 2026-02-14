const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/* ---------------- SCHEMA ---------------- */
const schema = new mongoose.Schema({
    _id: Number,
    name: String,
    country_id: Number,
    status: Number,
    created_at: Date,
    updated_at: Date
}, { timestamps: false });

const State = mongoose.model('states', schema, 'states');

/* ---------------- MIGRATION ---------------- */
async function migrate() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected (states)');

        const sql = fs.readFileSync(
            path.join(__dirname, 'stm_club.sql'),
            'utf8'
        );

        const regex = /INSERT INTO `states`[\s\S]*?VALUES\s*([\s\S]*?);/g;
        let match;
        let rows = [];

        while ((match = regex.exec(sql)) !== null) {
            const block = match[1]
                .trim()
                .replace(/^\(/, '')
                .replace(/\)$/, '')
                .split(/\),\s*\(/);

            rows.push(...block);
        }

        if (!rows.length) {
            console.log('ℹ️ No states data found');
            process.exit(0);
        }

        let success = 0;
        let skipped = 0;

        for (const row of rows) {
            const values = row
                .match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)
                ?.map(v => {
                    v = v.trim();
                    if (v === 'NULL') return null;
                    return v.startsWith("'") ? v.slice(1, -1) : v;
                });

            if (!values || values.length < 4) {
                skipped++;
                continue;
            }

            const id = Number(values[0]);
            const countryId = Number(values[2]);

            // 🚨 CRITICAL VALIDATION
            if (isNaN(id) || isNaN(countryId)) {
                skipped++;
                continue;
            }

            const doc = {
                _id: id,
                name: values[1],
                country_id: countryId,
                status: Number(values[3]) || 1,
                created_at: values[4] ? new Date(values[4]) : null,
                updated_at: values[5] ? new Date(values[5]) : null
            };

            await State.updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true }
            );

            success++;
        }

        console.log(`🎉 States migrated: ${success}`);
        console.log(`⚠️ Rows skipped (invalid): ${skipped}`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
