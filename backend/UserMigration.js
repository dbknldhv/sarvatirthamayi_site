const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Configuration - Update these to match your environment
const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';
const SQL_FILE_NAME = 'stm_club.sql'; 

// 1. Local Schema Definition (No external model file needed)
const userSchema = new mongoose.Schema({
    sql_id: Number,
    first_name: String,
    last_name: String,
    email: String,
    user_type: { type: Number, default: 3 }, 
    email_verified_at: Date,
    mobile_number: String,
    mobile_number_verified_at: Date,
    date_of_birth: Date,
    gender: { type: Number, default: 1 }, 
    profile_picture: String,
    password: { type: String, required: true },
    otp: String,
    otp_expiry_time: Date,
    remember_token: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { collection: 'users' });

// Create the model locally
const User = mongoose.model('User', userSchema);

async function startUserMigration() {
    try {
        // Connect to Database
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB for User Migration...");

        // Load SQL File
        const sqlPath = path.join(__dirname, SQL_FILE_NAME);
        if (!fs.existsSync(sqlPath)) {
            console.error(`❌ Error: File ${SQL_FILE_NAME} not found.`);
            process.exit(1);
        }
        const content = fs.readFileSync(sqlPath, 'utf8');

        // 2. Regex to capture the users table INSERT block
        const regex = /INSERT INTO `users` [^*]*? VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) throw new Error("Could not find users data in SQL file.");

        const rows = match[1].trim().split(/\),\s*\(/);

        const formatted = rows.map((row) => {
            let cleanRow = row.trim();
            if (cleanRow.startsWith('(')) cleanRow = cleanRow.substring(1);
            if (cleanRow.endsWith(')')) cleanRow = cleanRow.substring(0, cleanRow.length - 1);

            const values = cleanRow.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g).map(v => {
                let val = v.trim();
                if (val === 'NULL') return null;
                return val.startsWith("'") ? val.slice(1, -1) : val;
            });

            /**
             * PASSWORD NORMALIZATION
             * Converts PHP/Laravel bcrypt prefix ($2y$) to Node.js prefix ($2b$)
             */
            let passwordHash = values[13];
            if (passwordHash && passwordHash.startsWith('$2y$')) {
                passwordHash = passwordHash.replace('$2y$', '$2b$');
            }

            return {
                sql_id: parseInt(values[0]),
                first_name: values[1],
                last_name: values[2],
                email: values[3],
                user_type: parseInt(values[4]),
                email_verified_at: values[5] ? new Date(values[5]) : null,
                mobile_number: values[6],
                mobile_number_verified_at: values[7] ? new Date(values[7]) : null,
                date_of_birth: values[8] ? new Date(values[8]) : null,
                gender: parseInt(values[9]),
                profile_picture: values[10],
                otp: values[11],
                otp_expiry_time: values[12] ? new Date(values[12]) : null,
                password: passwordHash, // Fixed Hash
                remember_token: values[14],
                created_at: values[15] ? new Date(values[15]) : new Date(),
                updated_at: values[16] ? new Date(values[16]) : new Date()
            };
        }).filter(u => u.first_name !== null);

        // 3. Clear collection and Insert
        console.log(`Found ${formatted.length} records. Cleaning collection...`);
        await User.deleteMany({});
        
        const result = await User.insertMany(formatted);
        
        console.log(`✅ Success! ${result.length} users migrated to 'users' collection.`);
        console.log("Password hashes have been converted to Node.js format.");
        
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error("User Migration Error:", err);
        process.exit(1);
    }
}

startUserMigration();