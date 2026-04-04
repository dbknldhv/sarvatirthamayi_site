const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const mongoURI = "mongodb://127.0.0.1:27017/stm_club";

const purchasedMemberCardSchema = new mongoose.Schema(
  {
    sql_id: Number,
    user_id: Number,
    membership_card_id: Number,
    card_status: Number,
    start_date: Date,
    end_date: Date,
    max_visits: Number,
    used_visits: Number,
    payment_type: Number,
    payment_status: Number,
    razorpay_order_id: String,
    razorpay_payment_id: String,
    payment_date: Date,
    offer_id: Number,
    offer_discount_amount: Number,
    membership_card_amount: Number,
    paid_amount: Number,
    birthday: Date,
    important_date: Date,
    created_at: Date,
    updated_at: Date,
  },
  { collection: "PurchasedMemberCard" }
);

const PurchasedMemberCard = mongoose.model(
  "PurchasedMemberCard",
  purchasedMemberCardSchema
);

async function startMigration() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB: stm_club");

    const sqlPath = path.join(__dirname, "stm_club.sql");
    const content = fs.readFileSync(sqlPath, "utf8");

    const tableHeader = "INSERT INTO `purchased_member_cards`";
    const startIndex = content.indexOf(tableHeader);

    if (startIndex === -1) {
      throw new Error("Could not find purchased_member_cards table");
    }

    const valuesStart = content.indexOf("VALUES", startIndex) + 6;
    const valuesEnd = content.indexOf(";", valuesStart);
    const rawValues = content.substring(valuesStart, valuesEnd).trim();

    const rows = rawValues.split(/\),\s*\(/);

    const formatted = rows
      .map((row) => {
        let cleanRow = row.replace(/^\(|\)$/g, "").trim();

        const values = cleanRow
          .match(/NULL|'[^']*'|[^,]+/g)
          .map((v) => {
            let val = v.trim();
            if (val === "NULL") return null;
            return val.startsWith("'") ? val.slice(1, -1) : val;
          });

        return {
          sql_id: parseInt(values[0]),
          user_id: parseInt(values[1]),
          membership_card_id: parseInt(values[2]),
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
          offer_id: values[13] ? parseInt(values[13]) : null,
          offer_discount_amount: values[14]
            ? parseFloat(values[14])
            : null,
          membership_card_amount: parseFloat(values[15]),
          paid_amount: parseFloat(values[16]),
          birthday: values[17] ? new Date(values[17]) : null,
          important_date: values[18] ? new Date(values[18]) : null,
          created_at: values[19] ? new Date(values[19]) : null,
          updated_at: values[20] ? new Date(values[20]) : null,
        };
      })
      .filter((item) => !isNaN(item.sql_id));

    await PurchasedMemberCard.deleteMany({});
    const result = await PurchasedMemberCard.insertMany(formatted);

    console.log("✅ Migration Successful!");
    console.log(`📊 Records Inserted: ${result.length}`);
    console.log("📁 Target Collection: PurchasedMemberCard");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Error:", err.message);
    process.exit(1);
  }
}

startMigration();