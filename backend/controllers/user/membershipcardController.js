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
 */
const normalizeMembershipPlan = (plan = {}) => {
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
      message: "Membership card list fetched successfully", 
      data: {
        data: mappedData,
        total_count: mappedData.length,
        is_next: false,
        current_page: 1,
        next_page_url: null, 
      },
    });
  } catch (error) {
    console.error("🔥 List Fetch Error:", error.message);
    return res.status(500).json({ status: "false", message: "Error fetching plans" });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP (Initialize Razorpay)
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    const rawId = req.body.membership_card_id || req.body.memberShipId;
    const userId = req.user._id || req.user.id;

    // 1. 🎯 THE DB LOOKUP: Always verify price from DB to stop "Sticky Price"
    const membershipPlan = await Membership.findOne({ 
      $or: [
        { sql_id: parseInt(rawId) || 0 }, 
        { _id: mongoose.Types.ObjectId.isValid(rawId) ? rawId : null }
      ] 
    }).lean();

    if (!membershipPlan) {
      return res.status(404).json({ status: "false", message: "Plan not found" });
    }

    const correctPrice = Number(membershipPlan.price);
    const amountInPaise = Math.round(correctPrice * 100);

    // 2. 🎯 UNIQUE RECEIPT: Prevents Razorpay from reusing old price calculations
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `mem_${userId}_${rawId}_${Date.now()}`, 
    });

    // 3. Create the Purchase Record (Pending)
    const purchased = await PurchasedMemberCard.create({
      user_id: userId,
      membership_card_id: membershipPlan._id,
      sql_id: Date.now(),
      card_status: 0,
      payment_status: 1, // Pending
      razorpay_order_id: razorpayOrder.id,
      paid_amount: correctPrice,
      membership_card_amount: correctPrice
    });

    // 4. 🏁 THE RESPONSE (Strictly for compiled APK compatibility)
    return res.status(200).json({
      status: "true",
      success: true,
      // Matches Constants.memberShipVerifyPaymentSuccessMsg in Flutter
      message: "Membership card purchased successfully", 
      data: {
        id: Number(purchased.sql_id),
        user_id: 1, // Static fallback for legacy model
        membership_card_id: toInt(membershipPlan.sql_id) || 1,
        paid_amount: toString(correctPrice), // Helps Flutter UI update
        payment: {
          razorpay_order_id: toString(razorpayOrder.id),
          razorpay_public_key: toString(process.env.RAZORPAY_KEY_ID),
          amount: Number(amountInPaise),
          payment_status: 1,
          payment_type: 2
        }
      }
    });
  } catch (error) {
    console.error("🔥 Purchase Initialization Error:", error.message);
    res.status(500).json({ status: "false", message: "Internal Server Error" });
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