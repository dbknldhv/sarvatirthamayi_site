const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Membership = require("../../models/Membership");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/* --- 🎯 UNIVERSAL HELPERS --- */
const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

/**
 * 🎯 THE NORMALIZER (Helper)
 * Ensures every plan sent to Flutter has correct types and field names.
 */
const normalizeMembershipPlan = (plan = {}) => {
  // Generate a temporary integer ID from Mongo hex string if sql_id is missing
  const mongoIdInt = plan._id ? parseInt(plan._id.toString().substring(0, 8), 16) : 1;
  const finalId = toInt(plan.sql_id) || mongoIdInt;

  return {
    id: finalId,
    name: toString(plan.name),
    description: toString(plan.description),
    visits: toInt(plan.visits),
    price: toString(plan.price || "0"),
    duration: toInt(plan.duration),
    duration_type: toInt(plan.duration_type),
    status: toInt(plan.status),
  };
};

/* ---------------------------------------------------
1️⃣ GET ALL MEMBERSHIPS (Membership List)
--------------------------------------------------- */
exports.getActiveMemberships = async (req, res) => {
  try {
    const plans = await Membership.find({ status: 1 }).sort({ price: 1 }).lean();

    const mappedData = plans.map((plan) => normalizeMembershipPlan(plan));

    return res.status(200).json({
      status: "true",
      success: true,
      // Matches Constants.memberShipCardSuccessMsg in Flutter
      message: "Membership card list fetched successfully", 
      data: {
        data: mappedData,
        total_count: mappedData.length,
        is_next: false,
        current_page: 1,
        next_page_url: null, // Crucial for Bloc _hasMore logic
      },
    });
  } catch (error) {
    console.error("🔥 List Fetch Error:", error.message);
    return res.status(500).json({ status: "false", message: "Error fetching plans" });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP (Backend-Only Fix for Existing APK)
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    // 1. Capture ID (The APK sends "membership_card_id": 1)
    const rawId = req.body.membership_card_id || req.body.memberShipId;
    const userId = req.user._id || req.user.id;

    if (!rawId) return res.status(400).json({ status: "false", message: "ID missing" });

    // 2. Fetch the REAL plan from MongoDB using the ID provided
    let query = { status: 1 };
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      query._id = rawId;
    } else {
      // APK sends integer 1, so we look for sql_id: 1 in the database
      query.sql_id = parseInt(rawId);
    }

    const membership = await Membership.findOne(query);

    if (!membership) {
      console.error(`❌ Plan not found for ID: ${rawId}`);
      return res.status(404).json({ status: "false", message: "Membership plan not found" });
    }

    // 🎯 THE REAL PRICE FIX: 
    // We use the 'membership.price' from the database instead of a default.
    // Razorpay requires Paise (Price * 100)
    const amountInPaise = Math.round(Number(membership.price) * 100);

    // 3. Create Razorpay Order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
    });

    // 4. Create record (Date.now() for sql_id prevents the E11000 duplicate error)
    const purchased = await PurchasedMemberCard.create({
      user_id: userId,
      membership_card_id: membership._id,
      sql_id: Date.now(), 
      card_status: 0,
      payment_status: 1,
      max_visits: membership.visits,
      razorpay_order_id: razorpayOrder.id,
      paid_amount: membership.price
    });

    // 5. THE RESPONSE: Mapped exactly to your APK's member_ship_purchase_card_model.dart
    return res.status(200).json({
      status: "true",
      success: true,
      // 🎯 TRIGGER: This exact message string allows the Bloc to navigate/open Razorpay
      message: "Membership card purchased successfully", 
      data: {
        id: toInt(purchased.sql_id),
        user_id: 1, // Placeholder int for Model requirement
        membership_card_id: toInt(membership.sql_id) || 1,
        paid_amount: String(membership.price), // Displays real price in Flutter UI
        payment: {
          // 🎯 MUST be Snake Case to match 'Payment.fromJson' in the APK
          razorpay_order_id: razorpayOrder.id,
          razorpay_public_key: process.env.RAZORPAY_KEY_ID,
          amount: amountInPaise, 
          payment_status: 1,
          payment_type: 2
        }
      }
    });

  } catch (error) {
    console.error("🔥 APK Compatibility Fix Error:", error.message);
    return res.status(500).json({ status: "false", message: "Purchase initialization failed" });
  }
};

/* ---------------------------------------------------
3️⃣ VERIFY PAYMENT (Activation)
--------------------------------------------------- */
exports.verifyMembershipPayment = async (req, res) => {
  try {
    const razorpay_order_id = req.body.razorpay_order_id || req.body.razorPayOrderId;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.razorPayPaymentId;
    const razorpay_signature = req.body.razorpay_signature || req.body.razorPaySignature;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ status: "false", message: "Invalid signature" });
    }

    const purchased = await PurchasedMemberCard.findOne({ razorpay_order_id });
    if (!purchased) return res.status(404).json({ status: "false", message: "Record not found" });

    // Activate the record
    purchased.payment_status = 2; // Paid
    purchased.card_status = 1;    // Active
    purchased.start_date = new Date();
    purchased.razorpay_payment_id = razorpay_payment_id;
    purchased.razorpay_signature = razorpay_signature;

    await purchased.save();

    return res.status(200).json({
      status: "true",
      success: true,
      // Matches Constants.memberShipVerifyPaymentSuccessMsg in strings.dart
      message: "Membership card purchased successfully" 
    });
  } catch (error) {
    console.error("🔥 Verification Error:", error.message);
    return res.status(500).json({ status: "false", message: "Verification failed" });
  }
};

/* ---------------------------------------------------
4️⃣ GET CURRENT CARD (Home Screen)
--------------------------------------------------- */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const card = await PurchasedMemberCard.findOne({ user_id: userId, payment_status: 2, card_status: 1 })
      .sort({ created_at: -1 })
      .populate("membership_card_id")
      .lean();

    if (!card || !card.membership_card_id) {
      return res.status(200).json({
        status: "true",
        success: true,
        message: "Membership card fetched successfully",
        data: { id: 1, membership_card_name: "Guest", membership_card_id: 1, membership_card_price: "0" }
      });
    }

    const plan = card.membership_card_id;
    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership card fetched successfully",
      data: {
        id: toInt(plan.sql_id) || 1,
        membership_card_name: toString(plan.name),
        membership_card_id: toInt(plan.sql_id) || 1,
        membership_card_price: toString(card.paid_amount || plan.price),
        membership_card_description: toString(plan.description),
        membership_card_duration: toInt(plan.duration),
        membership_card_duration_type: toInt(plan.duration_type)
      }
    });
  } catch (error) {
    return res.status(500).json({ status: "false", message: "Error" });
  }
};