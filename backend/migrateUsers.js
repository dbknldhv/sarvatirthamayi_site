const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

// 1. Updated Schema with Sparse Indexes to allow multiple NULL/missing values
const userSchema = new mongoose.Schema({
    sql_id: Number,
    first_name: String,
    last_name: String,
    // sparse: true allows multiple records to have no email without triggering a duplicate error
    email: { type: String, unique: true, sparse: true }, 
    user_type: { type: Number, default: 3 }, 
    email_verified_at: Date,
    mobile_number: { type: String, unique: true, sparse: true }, 
    mobile_number_verified_at: Date,
    date_of_birth: Date,
    gender: { type: Number, default: 1 }, 
    profile_picture: String,
    otp: String,
    otp_expiry_time: Date,
    password: { type: String, required: true },
    remember_token: String,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
}, { collection: 'users' }); 

const User = mongoose.model('User', userSchema);

async function startMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB: stm_club");

        // CLEANUP: Drop existing indexes to ensure the new 'sparse' setting takes effect
        try {
            await User.collection.dropIndex("email_1");
            await User.collection.dropIndex("mobile_number_1");
            console.log("Existing indexes dropped to refresh sparse settings.");
        } catch (e) {
            console.log("No existing indexes to drop or already clean.");
        }

        const sqlPath = path.join(__dirname, 'stm_club (1).sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        const tableHeader = "INSERT INTO `users`";
        const startIndex = content.indexOf(tableHeader);
        
        if (startIndex === -1) throw new Error("Could not find 'users' table data in SQL file.");

        const valuesStart = content.indexOf("VALUES", startIndex) + 6;
        const valuesEnd = content.indexOf(";", valuesStart);
        const rawValues = content.substring(valuesStart, valuesEnd).trim();

        const rows = rawValues.split(/\),\s*\(/);

        const formatted = rows.map((row) => {
            let cleanRow = row.replace(/^\(|\)$/g, "").trim();
            const values = cleanRow.match(/NULL|'[^']*'|[^,]+/g).map(v => {
                let val = v.trim();
                if (val === 'NULL') return null;
                return val.startsWith("'") ? val.slice(1, -1) : val;
            });

            // 2. Data Cleaning: If a value is null, we exclude the key so Sparse Index works
            const userObj = {
                sql_id: parseInt(values[0]),
                first_name: values[1],
                last_name: values[2],
                user_type: parseInt(values[4]) || 3,
                email_verified_at: values[5] ? new Date(values[5]) : null,
                mobile_number_verified_at: values[7] ? new Date(values[7]) : null,
                date_of_birth: values[8] ? new Date(values[8]) : null,
                gender: parseInt(values[9]) || 1,
                profile_picture: values[10],
                otp: values[11],
                otp_expiry_time: values[12] ? new Date(values[12]) : null,
                password: values[13],
                remember_token: values[14],
                created_at: values[15] ? new Date(values[15]) : null,
                updated_at: values[16] ? new Date(values[16]) : null
            };

            // Only add email/mobile if they actually exist
            if (values[3] && values[3] !== 'NULL') userObj.email = values[3];
            if (values[6] && values[6] !== 'NULL') userObj.mobile_number = values[6];

            return userObj;
        }).filter(item => !isNaN(item.sql_id));

        // 3. Re-insert data
        await User.deleteMany({});
        const result = await User.insertMany(formatted);

        console.log(`✅ Migration Successful!`);
        console.log(`📊 Records Inserted: ${result.length}`);
        
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Error:", err.message);
        process.exit(1);
    }
}

startMigration();