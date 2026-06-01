const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const mongoURI = "mongodb://127.0.0.1:27017/stm_club";

// Define temporary models to fetch mappings
const User = mongoose.model('User', new mongoose.Schema({ sql_id: Number }, { collection: 'users' }));
const MembershipPlan = mongoose.model('Membership', new mongoose.Schema({ sql_id: Number }, { collection: 'memberships' }));
const PurchasedMemberCard = mongoose.model("PurchasedMemberCard", new mongoose.Schema({}, { strict: false, collection: "purchasedmembercards" }));

async function startMigration() {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // 1. Create ID Maps: { sql_id: ObjectId }
    const users = await User.find({ sql_id: { $exists: true } });
    const userMap = {};
    users.forEach(u => userMap[u.sql_id] = u._id);

    const plans = await MembershipPlan.find({ sql_id: { $exists: true } });
    const planMap = {};
    plans.forEach(p => planMap[p.sql_id] = p._id);

    // 2. Parse SQL
    const sqlPath = path.join(__dirname, "stm_club.sql");
    const content = fs.readFileSync(sqlPath, "utf8");
    const tableHeader = "INSERT INTO `purchased_member_cards`";
    const startIndex = content.indexOf(tableHeader);
    
    if (startIndex === -1) throw new Error("Could not find table data");

    const valuesStart = content.indexOf("VALUES", startIndex) + 6;
    const valuesEnd = content.indexOf(";", valuesStart);
    const rows = content.substring(valuesStart, valuesEnd).trim().split(/\),\s*\(/);

    const formatted = rows.map((row) => {
        let cleanRow = row.replace(/^\(|\)$/g, "").trim();
        const values = cleanRow.match(/NULL|'[^']*'|[^,]+/g).map(v => {
            let val = v.trim();
            if (val === "NULL") return null;
            return val.startsWith("'") ? val.slice(1, -1) : val;
        });

        // 3. MAP THE IDs
        const sqlUserId = parseInt(values[1]);
        const sqlCardId = parseInt(values[2]);

        return {
          sql_id: parseInt(values[0]),
          // Mapping to MongoDB ObjectIds
          user_id: userMap[sqlUserId] || null, 
          membership_card_id: planMap[sqlCardId] || null,
          card_status: parseInt(values[3]),
          start_date: values[4] ? new Date(values[4]) : null,
          end_date: values[5] ? new Date(values[5]) : null,
          max_visits: parseInt(values[6]),
          used_visits: parseInt(values[7]),
          payment_type: parseInt(values[8]),
          payment_status: parseInt(values[9]),
          razorpay_order_id: values[10],
          razorpay_payment_id: values[11],
          payment_date: values[12] ? new Date(values[12]) : null,
          paid_amount: parseFloat(values[16]),
          created_at: values[19] ? new Date(values[19]) : new Date(),
          updated_at: values[20] ? new Date(values[20]) : new Date()
        };
    });

    await PurchasedMemberCard.deleteMany({});
    const result = await PurchasedMemberCard.insertMany(formatted);

    console.log(`✅ Migration Successful! Inserted: ${result.length} records.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Error:", err.message);
    process.exit(1);
  }
}

startMigration();