const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

// Define the Schema to match your Mongoose needs
const donationSchema = new mongoose.Schema({
    temple_id: Number,
    name: String,
    short_description: String,
    long_description: String,
    mobile_number: String,
    image: String,
    address: {
        line1: String,
        line2: String,
        landmark: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number] // [longitude, latitude]
    },
    address_url: String,
    status: Number,
    sequence: Number,
    created_at: Date,
    updated_at: Date
});

const Donation = mongoose.model('Donation', donationSchema);

async function startMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB...");

        const sqlPath = path.join(__dirname, 'stm_club (1).sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        // Extract the massive block of data inside INSERT INTO
        const regex = /INSERT INTO `donations` [\s\S]*? VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) throw new Error("Could not find data in SQL file.");

        // Split data into individual rows
        const rows = match[1].split('),\n(');

        const formatted = rows.map(row => {
            // This helper function handles SQL commas vs commas inside strings
            const values = row.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g).map(v => {
                let val = v.trim();
                if (val === 'NULL') return null;
                return val.startsWith("'") ? val.slice(1, -1) : val;
            });

            return {
                temple_id: parseInt(values[1]),
                name: values[2],
                short_description: values[3],
                long_description: values[4],
                mobile_number: values[5],
                image: values[6],
                address: {
                    line1: values[7],
                    line2: values[8],
                    landmark: values[9],
                    city: values[10],
                    state: values[11],
                    pincode: values[12],
                    country: values[13] || 'India'
                },
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(values[15]), parseFloat(values[14])] // [Long, Lat]
                },
                address_url: values[16],
                status: parseInt(values[17]),
                sequence: parseInt(values[18]),
                created_at: values[19] ? new Date(values[19]) : new Date(),
                updated_at: values[20] ? new Date(values[20]) : new Date()
            };
        });

        await Donation.deleteMany({}); // Wipe existing dummy data
        await Donation.insertMany(formatted);
        
        console.log(`✅ Success! ${formatted.length} records migrated from SQL file.`);
        process.exit();

    } catch (err) {
        console.error("Migration Error:", err);
        process.exit(1);
    }
}

startMigration();