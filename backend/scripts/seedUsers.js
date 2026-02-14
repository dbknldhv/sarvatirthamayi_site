// scripts/seedUsers.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); 
const path = require('path');
const dotenv = require('dotenv');

// 🛠️ Force dotenv to look for the .env file in the parent (backend) directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stm_club';
    
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB...");

    // Using 12 rounds to match your User.js model logic
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('123456', salt);

    const adminData = {
      name: 'Super Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin',
      user_type: 1, 
      first_name: 'Super',
      last_name: 'Admin',
      mobile_number: '9951206867'
    };

    // Use findOneAndUpdate with upsert:true to overwrite existing "bad" hashes
    await User.findOneAndUpdate(
      { email: 'admin@gmail.com' },
      { $set: adminData },
      { upsert: true, new: true }
    );

    console.log("✅ Admin seeded/updated successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedAdmin();