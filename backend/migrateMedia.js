const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = 'mongodb://127.0.0.1:27017/stm_club';

/**
 * Media Schema (mapped from SQL)
 */
const mediaSchema = new mongoose.Schema({
    sql_id: Number,
    model_type: String,
    model_id: Number,
    uuid: String,
    collection_name: String,
    name: String,
    file_name: String,
    mime_type: String,
    disk: String,
    conversions_disk: String,
    size: Number,
    manipulations: Object,
    custom_properties: Object,
    generated_conversions: Object,
    responsive_images: Object,
    order_column: Number,
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null }
});

const Media = mongoose.model('Media', mediaSchema);

async function startMediaMigration() {
    try {
        await mongoose.connect(mongoURI);
        console.log("✅ Connected to MongoDB for Media Migration...");

        const sqlPath = path.join(__dirname, 'stm_club (1).sql');
        const content = fs.readFileSync(sqlPath, 'utf8');

        /**
         * Extract INSERT block for `media`
         */
        const regex = /INSERT INTO `media` [^]*? VALUES\s*\(([\s\S]*?)\);/;
        const match = content.match(regex);

        if (!match) {
            throw new Error("❌ Could not find media data in SQL file.");
        }

        /**
         * Split rows safely
         */
        const rows = match[1].trim().split(/\),\s*\(/);

        const formatted = rows.map((row, index) => {
            let cleanRow = row.trim();
            if (cleanRow.startsWith('(')) cleanRow = cleanRow.slice(1);
            if (cleanRow.endsWith(')')) cleanRow = cleanRow.slice(0, -1);

            /**
             * Extract values safely (handles NULL, JSON, strings)
             */
            const values = cleanRow.match(/NULL|'[^']*'|(?<=,|^)[^,']+(?=,|$)/g)
                .map(v => {
                    const val = v.trim();
                    if (val === 'NULL') return null;
                    return val.startsWith("'") ? val.slice(1, -1) : val;
                });

            try {
                return {
                    sql_id: parseInt(values[0]),
                    model_type: values[1],
                    model_id: parseInt(values[2]),
                    uuid: values[3],
                    collection_name: values[4],
                    name: values[5],
                    file_name: values[6],
                    mime_type: values[7],
                    disk: values[8],
                    conversions_disk: values[9],
                    size: parseInt(values[10]),
                    manipulations: JSON.parse(values[11] || '{}'),
                    custom_properties: JSON.parse(values[12] || '{}'),
                    generated_conversions: JSON.parse(values[13] || '{}'),
                    responsive_images: JSON.parse(values[14] || '{}'),
                    order_column: values[15] ? parseInt(values[15]) : null,
                    created_at: values[16] ? new Date(values[16]) : null,
                    updated_at: values[17] ? new Date(values[17]) : null
                };
            } catch (err) {
                console.warn(`⚠️ Skipping invalid row ${index}`, err);
                return null;
            }
        }).filter(Boolean);

        await Media.deleteMany({});
        await Media.insertMany(formatted);

        console.log(`🎉 Success! ${formatted.length} media records migrated.`);
        process.exit();

    } catch (err) {
        console.error("❌ Media Migration Error:", err);
        process.exit(1);
    }
}

startMediaMigration();
