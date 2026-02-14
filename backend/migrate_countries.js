const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/* ---------------- SCHEMA ---------------- */
const schema = new mongoose.Schema({
    _id: Number,
    name: String,
    code: String,
    phone_code: String,
    status: Number,
    created_at: Date,
    updated_at: Date
}, { timestamps: false });

const Country = mongoose.model(
    'countries',
    schema,
    'countries'
);

/* ---------------- MIGRATION ---------------- */
async function migrate() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected (countries)');

        const sql = fs.readFileSync(
            path.join(__dirname, 'stm_club.sql'),
            'utf8'
        );

        const regex = /INSERT INTO `countries`[\s\S]*?VALUES\s*([\s\S]*?);/g;
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
            console.log('ℹ️ No countries data found');
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
                code: values[2],
                phone_code: values[3],
                status: Number(values[4]) || 0,
                created_at: values[5] ? new Date(values[5]) : null,
                updated_at: values[6] ? new Date(values[6]) : null
            };
        });

        // ✅ UPSERT (safe to re-run)
        for (const doc of docs) {
            await Country.updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true }
            );
        }

        console.log(`🎉 Migrated ${docs.length} countries`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
