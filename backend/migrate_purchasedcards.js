const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

// 1. Define Lookup Schemas
const User = mongoose.model('users', new mongoose.Schema({ sql_id: Number }));
const MembershipCard = mongoose.model('membership_cards', new mongoose.Schema({ sql_id: Number }));

// 2. Define Full Purchased Card Schema
const PurchasedCard = mongoose.model('purchased_member_cards', new mongoose.Schema({
    sql_id: Number,
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    membership_card_id: { type: mongoose.Schema.Types.ObjectId, ref: 'membership_cards' },
    card_status: Number,
    start_date: Date,
    end_date: Date,
    max_visits: Number,
    used_visits: Number,
    payment_type: Number,
    payment_status: Number,
    razorpay_order_id: String,
    razorpay_payment_id: String,
    payment_date: Date,
    offer_id: Number, // Keeping SQL ID for offers as reference
    offer_discount_amount: Number,
    membership_card_amount: Number,
    paid_amount: Number,
    birthday: Date,
    important_date: Date,
    created_at: Date,
    updated_at: Date
}, { timestamps: false })); // Manual timestamps from SQL

async function startPurchasedCardsMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const sqlPath = path.join(__dirname, 'stm_club.sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        const regex = /INSERT INTO `purchased_member_cards`[\s\S]*?VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) throw new Error('❌ purchased_member_cards data not found');

        const rows = match[1].trim().split(/\),\s*\(/);
        const migratedRecords = [];

        console.log(`⏳ Processing ${rows.length} rows...`);

        for (const row of rows) {
            let cleanRow = row.trim().replace(/^\(|\)$/g, '');
            
            // Advanced regex to handle strings with commas inside correctly
            const values = cleanRow.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g).map(v => {
                v = v.trim();
                if (v === 'NULL') return null;
                return v.startsWith("'") ? v.slice(1, -1) : v;
            });

            const sqlId = parseInt(values[0]);
            const sqlUserId = parseInt(values[1]);
            const sqlCardId = parseInt(values[2]);

            // Lookup Mongo ObjectIDs
            const mongoUser = await User.findOne({ sql_id: sqlUserId });
            const mongoCard = await MembershipCard.findOne({ sql_id: sqlCardId });

            if (!mongoUser || !mongoCard) {
                console.warn(`⚠️ Skipping Row ${sqlId}: User ${sqlUserId} or Card ${sqlCardId} not found.`);
                continue;
            }

            migratedRecords.push({
                sql_id: sqlId,                                 // values[0]
                user_id: mongoUser._id,                        // values[1]
                membership_card_id: mongoCard._id,             // values[2]
                card_status: parseInt(values[3]),              // values[3]
                start_date: values[4] ? new Date(values[4]) : null, // values[4]
                end_date: values[5] ? new Date(values[5]) : null,   // values[5]
                max_visits: parseInt(values[6]) || 0,          // values[6]
                used_visits: parseInt(values[7]) || 0,         // values[7]
                payment_type: parseInt(values[8]) || 1,        // values[8]
                payment_status: parseInt(values[9]) || 1,      // values[9]
                razorpay_order_id: values[10],                 // values[10]
                razorpay_payment_id: values[11],               // values[11]
                payment_date: values[12] ? new Date(values[12]) : null, // values[12]
                offer_id: values[13] ? parseInt(values[13]) : null,    // values[13]
                offer_discount_amount: parseFloat(values[14]) || 0,    // values[14]
                membership_card_amount: parseFloat(values[15]) || 0,   // values[15]
                paid_amount: parseFloat(values[16]) || 0,              // values[16]
                birthday: values[17] ? new Date(values[17]) : null,    // values[17]
                important_date: values[18] ? new Date(values[18]) : null, // values[18]
                created_at: values[19] ? new Date(values[19]) : new Date(), // values[19]
                updated_at: values[20] ? new Date(values[20]) : new Date()  // values[20]
            });
        }

        if (migratedRecords.length > 0) {
            await PurchasedCard.deleteMany({}); // Clear collection before migration
            await PurchasedCard.insertMany(migratedRecords);
            console.log(`🎉 Success! Migrated ${migratedRecords.length} purchase records.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
}

startPurchasedCardsMigration();