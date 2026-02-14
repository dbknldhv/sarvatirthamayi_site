const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

const check = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await User.countDocuments();
    const lastUser = await User.findOne().sort({ _id: -1 });
    
    console.log(`Current DB: ${mongoose.connection.name}`);
    console.log(`Total users in DB: ${count}`);
    console.log(`Last user added:`, lastUser ? lastUser.first_name : "None");
    
    process.exit();
};

check();