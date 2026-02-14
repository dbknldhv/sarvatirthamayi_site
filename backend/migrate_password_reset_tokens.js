const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

const schema = new mongoose.Schema({
    email: String,
    token: String,
    created_at: { type: Date, default: null }
}, { timestamps: false });

const PasswordResetToken = mongoose.model(
    'password_reset_tokens',
    schema,
    'password_reset_tokens'
);

async function migrate() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected (password_reset_tokens)');

        const sql = fs.readFileSync(
            path.join(__dirname, 'stm_club.sql'),
            'utf8'
        );

        const regex = /INSERT INTO `password_reset_tokens`[\s\S]*?VALUES\s*([\s\S]*?);/g;

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
            console.log('ℹ️ No password_reset_tokens data found');
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
                email: values[0],
                token: values[1],
                created_at: values[2] ? new Date(values[2]) : null
            };
        });

        await PasswordResetToken.deleteMany({});
        await PasswordResetToken.insertMany(docs);

        console.log(`🎉 Migrated ${docs.length} password reset tokens`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
