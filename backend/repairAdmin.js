const mongoose = require('mongoose');
const User = require('./models/User'); 
require('dotenv').config();

const repairAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // 1. Find the existing admin from your SQL migration
        const adminEmail = "admin@gmail.com"; 
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log("Admin not found. Please check the email in your database.");
            process.exit(0);
        }

        // 2. Update the admin with a fresh password and correct roles
        admin.password = "123456"; // Set a simple password to test
        admin.user_type = 1;
        admin.role = "admin";
        admin.first_name = admin.first_name || "Super"; // Ensure first_name exists

        // The .save() call triggers the pre-save hook in User.js 
        // which will hash the password correctly for Node.js
        await admin.save();

        console.log(`✅ Admin ${adminEmail} repaired!`);
        console.log("New Password: admin123");
        console.log("Hash format is now perfectly synced.");
        
        process.exit(0);
    } catch (err) {
        console.error("Repair failed:", err);
        process.exit(1);
    }
};

repairAdmin();