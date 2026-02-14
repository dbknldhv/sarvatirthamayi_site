const mongoose = require("mongoose");
const Membership = require("./models/Membership");
const Temple = require("./models/Temple");
require("dotenv").config();

// 1. Data from table `membership_cards`
const cards = [
    { id: 1, name: '1 Visit Any Temple', desc: 'Save 10%', visits: 23, price: 999.00, dur: 1, dtype: 1 },
    { id: 2, name: '2 Visit Any Temple', desc: 'Save 20%', visits: 13, price: 1999.00, dur: 3, dtype: 1 },
    { id: 3, name: '4 Visit Any Temple', desc: 'Save 35%', visits: 21, price: 4999.00, dur: 1, dtype: 2 },
    { id: 4, name: '3 Visit Any Temple', desc: 'Save 10%', visits: 23, price: 2899.00, dur: 1, dtype: 1 },
    { id: 5, name: '6 Visit Any Temple', desc: 'Save 20%', visits: 21, price: 5599.00, dur: 3, dtype: 1 },
    { id: 6, name: '8 Visit Any Temple', desc: 'Save 35%', visits: 15, price: 6599.00, dur: 1, dtype: 2 }
];

// 2. Data from table `member_card_temples` (Pivot data)
const cardTemples = [
    { card_id: 1, temple_sql_id: 6, max: 10 }, { card_id: 1, temple_sql_id: 24, max: 3 }, { card_id: 1, temple_sql_id: 30, max: 10 },
    { card_id: 2, temple_sql_id: 6, max: 6 }, { card_id: 2, temple_sql_id: 24, max: 4 }, { card_id: 2, temple_sql_id: 30, max: 3 },
    { card_id: 3, temple_sql_id: 6, max: 9 }, { card_id: 3, temple_sql_id: 24, max: 7 }, { card_id: 3, temple_sql_id: 30, max: 5 },
    { card_id: 4, temple_sql_id: 6, max: 9 }, { card_id: 4, temple_sql_id: 24, max: 5 }, { card_id: 4, temple_sql_id: 30, max: 9 },
    { card_id: 5, temple_sql_id: 6, max: 9 }, { card_id: 5, temple_sql_id: 24, max: 10 }, { card_id: 5, temple_sql_id: 30, max: 2 },
    { card_id: 6, temple_sql_id: 6, max: 2 }, { card_id: 6, temple_sql_id: 24, max: 10 }, { card_id: 6, temple_sql_id: 30, max: 3 }
];

const migrateMemberships = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🚀 Connected to MongoDB. Starting Relationship Migration...");

        for (const card of cards) {
            const associatedTemples = [];
            
            // Filter the pivot data for the current card
            const relations = cardTemples.filter(r => r.card_id === card.id);
            
            for (const rel of relations) {
                // Find the Temple in MongoDB using the sql_id from your previous migration
                const templeDoc = await Temple.findOne({ sql_id: rel.temple_sql_id });
                
                if (templeDoc) {
                    associatedTemples.push({
                        temple: templeDoc._id,
                        max_visits: rel.max
                    });
                } else {
                    console.warn(`⚠️ Warning: Temple with sql_id ${rel.temple_sql_id} not found for card ${card.id}`);
                }
            }

            // Update or Insert the Membership Card
            await Membership.findOneAndUpdate(
                { sql_id: card.id },
                {
                    name: card.name,
                    description: card.desc,
                    visits: card.visits,
                    price: card.price,
                    duration: card.dur,
                    duration_type: card.dtype,
                    status: 1,
                    temples: associatedTemples
                },
                { upsert: true, new: true, runValidators: true }
            );
            console.log(`✅ Migrated: ${card.name} (${associatedTemples.length} temples linked)`);
        }

        console.log("\n✨ All Membership Cards and Temple Relations Migrated Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
};

migrateMemberships();