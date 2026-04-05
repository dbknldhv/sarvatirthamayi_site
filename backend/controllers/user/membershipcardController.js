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
2️⃣ PURCHASE MEMBERSHIP (Zero-Dart-Change Version)
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    // 1. Capture the ID exactly as your current APK sends it
    const rawId = req.body.membership_card_id || req.body.memberShipId;
    const userId = req.user._id || req.user.id;

    // 2. Locate the plan using standard logic
    let query = { status: 1 };
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      query._id = rawId;
    } else {
      query.sql_id = parseInt(rawId);
    }

    const membership = await Membership.findOne(query);

    if (!membership) {
      return res.status(404).json({ status: "false", message: "Plan not found" });
    }

    // 3. Create Razorpay Order with REAL price from DB
    const amountInPaise = Math.round(Number(membership.price) * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
    });

    // 4. Save Record - Use Date.now() to bypass the 'sql_id' unique index crash
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

    // 5. THE CRITICAL PART: The response must match your APK's logic exactly
    return res.status(200).json({
      status: "true",
      success: true,
      // 🎯 MUST MATCH: This string is what triggers the popup in your APK
      message: "Membership card purchased successfully", 
      data: {
        id: purchased.sql_id,
        user_id: 1, 
        membership_card_id: parseInt(membership.sql_id) || 1,
        paid_amount: String(membership.price),
        payment: {
          // 🎯 MUST BE SNAKE_CASE: Your APK's Payment model looks for these keys
          razorpay_order_id: razorpayOrder.id,
          razorpay_public_key: process.env.RAZORPAY_KEY_ID,
          amount: amountInPaise,
          payment_status: 1,
          payment_type: 2
        }
      }
    });

  } catch (error) {
    console.error("🔥 APK Bypass Fix Error:", error.message);
    // If it fails, send a clean 500 so the app shows a toast instead of crashing
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