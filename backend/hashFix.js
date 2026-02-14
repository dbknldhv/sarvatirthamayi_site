const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User'); // Ensure this path is correct

dotenv.config();

const fixPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB for Password Fix...");

        const users = await User.find({});
        console.log(`🔍 Found ${users.length} users to check.`);

        for (let user of users) {
            // Check if password is already hashed (bcrypt hashes start with $2)
            if (!user.password.startsWith('$2')) {
                console.log(`⚙️ Hashing password for: ${user.email || user.mobile_number}`);
                
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
                
                // Save manually to bypass any validation that might interfere
                await user.save();
                console.log(`✅ Success for: ${user.email}`);
            } else {
                console.log(`⏩ Skipping ${user.email} (Already Hashed)`);
            }
        }

        console.log("\n✨ All passwords are now secure and compatible with Login.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Fix failed:", err);
        process.exit(1);
    }
};

fixPasswords();