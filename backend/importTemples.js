const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = 'mongodb://localhost:27017/stm_club';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB...'))
  .catch(err => console.error('❌ Connection error:', err));

const templeSchema = new mongoose.Schema({}, { strict: false });
const Temple = mongoose.model('Temple', templeSchema);

async function runImport() {
  try {
    const sqlPath = path.join(__dirname, 'temples.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error("❌ Error: temples.sql file not found in the backend folder!");
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the file to find the data after "VALUES"
    const splitContent = sqlContent.split(/INSERT INTO `temples` .*? VALUES/gi);
    
    if (splitContent.length < 2) {
      console.error("❌ Error: Could not find 'INSERT INTO temples' data in the SQL file.");
      return;
    }

    // Combine all value blocks (in case there are multiple INSERT statements)
    let allValues = "";
    for(let i = 1; i < splitContent.length; i++) {
        allValues += splitContent[i].trim();
    }

    // Split by rows: ),( or );
    const rows = allValues.split(/\),/g);
    console.log(`Found ${rows.length} potential rows. Starting clean up...`);

    const templeData = rows.map(row => {
      // Clean up brackets and semicolons
      let cleanRow = row.trim().replace(/^\(/, '').replace(/\);$/, '').replace(/\)$/, '');
      
      // Split by comma (ignoring commas inside quotes)
      const values = cleanRow.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(v => {
        let val = v.trim();
        return val === 'NULL' ? null : val.replace(/^'|'$/g, '');
      });

      return {
        sql_id: parseInt(values[0]),
        name: values[2],
        short_description: values[3],
        visit_price: parseFloat(values[9]),
        city: values[13],
        state: values[15],
        image: values[26],
        status: parseInt(values[23])
      };
    }).filter(item => item.name); // Remove empty rows

    console.log(`Parsed ${templeData.length} temples successfully!`);

    await Temple.deleteMany({});
    await Temple.insertMany(templeData);

    console.log('🚀 Data Import Complete!');
    process.exit();
  } catch (error) {
    console.error('❌ Critical Error:', error);
    process.exit(1);
  }
}

runImport();