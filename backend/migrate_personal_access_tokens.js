const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

const schema = new mongoose.Schema({
    _id: Number,
    tokenable_type: String,
    tokenable_id: Number,
    name: String,
    token: String,
    abilities: Array,
    last_used_at: Date,
    expires_at: Date,
    created_at: Date,
    updated_at: Date
}, { timestamps: false });

const Token = mongoose.model(
    'personal_access_tokens',
    schema,
    'personal_access_tokens'
);

// ✅ SAFE JSON PARSER FOR LARAVEL ESCAPED JSON
function parseAbilities(value) {
    if (!value) return [];

    try {
        // Convert "[\"*\"]"  →  ["*"]
        const cleaned = value.replace(/\\"/g, '"');
        return JSON.parse(cleaned);
    } catch (e) {
        return [];
    }
}

async function migrate() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected (personal_access_tokens)');

        const sql = fs.readFileSync(
            path.join(__dirname, 'stm_club.sql'),
            'utf8'
        );

        const regex = /INSERT INTO `personal_access_tokens`[\s\S]*?VALUES\s*([\s\S]*?);/g;
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
            console.log('ℹ️ No personal_access_tokens data found');
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
                tokenable_type: values[1],
                tokenable_id: Number(values[2]),
                name: values[3],
                token: values[4],
                abilities: parseAbilities(values[5]),
                last_used_at: values[6] ? new Date(values[6]) : null,
                expires_at: values[7] ? new Date(values[7]) : null,
                created_at: values[8] ? new Date(values[8]) : null,
                updated_at: values[9] ? new Date(values[9]) : null
            };
        });

        // ✅ UPSERT — safe re-run anytime
        for (const doc of docs) {
            await Token.updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true }
            );
        }

        console.log(`🎉 Migrated ${docs.length} personal access tokens`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
