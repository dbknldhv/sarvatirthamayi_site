const mongoose = require('mongoose');

// Adjust your URI if needed
const mongoURI = "mongodb://127.0.0.1:27017/stm_club";

async function relinkOrphans() {
    try {
        await mongoose.connect(mongoURI);
        console.log("🚀 Starting Relink Process...");

        const User = mongoose.model('User', new mongoose.Schema({ sql_id: Number }, { strict: false }));
        const PurchasedMemberCard = mongoose.model('PurchasedMemberCard', new mongoose.Schema({ user_id: mongoose.Schema.Types.Mixed }, { strict: false }));

        // Find cards where user_id is still a number (the legacy SQL ID)
        const cards = await PurchasedMemberCard.find({ user_id: { $type: "number" } });
        console.log(`Found ${cards.length} cards needing relinking...`);

        let count = 0;
        for (let card of cards) {
            const user = await User.findOne({ sql_id: card.user_id });
            if (user) {
                await PurchasedMemberCard.updateOne(
                    { _id: card._id },
                    { $set: { user_id: user._id } } 
                );
                count++;
            }
        }
        console.log(`✅ Relinked ${count} records successfully.`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ Relink Error:", err);
        process.exit(1);
    }
}

relinkOrphans();