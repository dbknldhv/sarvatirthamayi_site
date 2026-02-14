const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/* ---------------- SCHEMA ---------------- */
const schema = new mongoose.Schema({
    _id: Number,
    name: String,
    state_id: Number,
    created_at: Date,
    updated_at: Date
}, { timestamps: false });

const City = mongoose.model(
    'cities',
    schema,
    'cities'
);

/* ---------------- MIGRATION ---------------- */
async function migrate() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected (cities)');

        const sql = fs.readFileSync(
            path.join(__dirname, 'stm_club.sql'),
            'utf8'
        );

        const regex = /INSERT INTO `cities`[\s\S]*?VALUES\s*([\s\S]*?);/g;
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
            console.log('ℹ️ No cities data found');
            process.exit(0);
        }

        const docs = rows.map(row => {
            const values = row
                .match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)
                .map(v => {
                    v = v.trim();
                    if (v === 'NULL') return null;
                    return v.startsWith("'") ? v.slice(1, -1) : v;
                });

            return {
                _id: Number(values[0]),
                name: values[1],
                state_id: Number(values[2]),
                created_at: values[3] ? new Date(values[3]) : null,
                updated_at: values[4] ? new Date(values[4]) : null
            };
        });

        // ✅ UPSERT (safe to re-run)
        for (const doc of docs) {
            await City.updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true }
            );
        }

        console.log(`🎉 Migrated ${docs.length} cities`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
