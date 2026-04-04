const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Membership = require("../../models/Membership");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/* ---------------------------------------------------
   HELPERS (STRICT TYPE CASTING FOR FLUTTER)
   --------------------------------------------------- */

const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

/**
 * 🎯 Format for MembershipCardModel in Flutter
 */
const normalizeMembershipPlan = (plan = {}) => ({
  // CRITICAL: Flutter int? cannot take a String _id. Must use sql_id.
  id: toInt(plan.sql_id), 
  name: toString(plan.name),
  description: toString(plan.description),
  visits: toInt(plan.visits),
  price: toString(plan.price), // Flutter usually expects price as String for display
  duration: toInt(plan.duration),
  duration_type: toInt(plan.duration_type),
  status: toInt(plan.status),
  temples: Array.isArray(plan.temples)
    ? plan.temples.map((t) => ({
        temple_id: toString(t.temple_id),
        name: toString(t.temple_name), // Using the field from your Schema
        max_visits: toInt(t.max_visits),
      }))
    : [],
});

/* ---------------------------------------------------
1️⃣ MEMBERSHIP PLAN LIST
GET /api/v1/membership-card/index
--------------------------------------------------- */
exports.getActiveMemberships = async (req, res) => {
  try {
    const plans = await Membership.find({ status: 1 }).sort({ price: 1 }).lean();

    const mapped = plans.map(normalizeMembershipPlan);

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_card_success",
      data: {
        data: mapped,
      },
    });
  } catch (error) {
    console.error("🔥 Membership List Error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to load plans",
      data: { data: [] },
    });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP
POST /api/v1/membership-card/purchase
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    const userId = req.user.id; // From Protect Middleware (String)
    const { membership_card_id } = req.body;

    // Support lookup by MongoDB _id OR sql_id
    const membership = await Membership.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(membership_card_id) ? membership_card_id : new mongoose.Types.ObjectId() },
        { sql_id: toInt(membership_card_id) }
      ],
      status: 1
    });

    if (!membership) {
      return res.status(404).json({ status: "false", message: "Plan not found" });
    }

    const amount = Math.round(Number(membership.price) * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
    });

    const purchased = await PurchasedMemberCard.create({
      user_id: userId,
      membership_card_id: membership._id,
      card_status: 0, 
      payment_status: 1, 
      max_visits: membership.visits,
      used_visits: 0,
      razorpay_order_id: razorpayOrder.id,
      membership_card_amount: membership.price,
      paid_amount: membership.price
    });

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Order created",
      data: {
        purchased_member_card_id: purchased._id,
        razorpay_order_id: razorpayOrder.id,
        amount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error("🔥 Purchase Error:", error);
    return res.status(500).json({ status: "false", message: "Purchase failed" });
  }
};

/* ---------------------------------------------------
3️⃣ VERIFY PAYMENT
POST /api/v1/membership-card/verify-payment
--------------------------------------------------- */
exports.verifyMembershipPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ status: "false", message: "Invalid signature" });
    }

    const purchased = await PurchasedMemberCard.findOne({ razorpay_order_id });
    if (!purchased) return res.status(404).json({ status: "false", message: "Record not found" });

    const membership = await Membership.findById(purchased.membership_card_id);

    const now = new Date();
    purchased.payment_status = 2; // Paid
    purchased.card_status = 1;    // Active
    purchased.start_date = now;
    
    // Calculate end date based on duration type (Assume months if type 1)
    const end = new Date(now);
    if (membership.duration_type === 2) {
        end.setFullYear(end.getFullYear() + (membership.duration || 1));
    } else {
        end.setMonth(end.getMonth() + (membership.duration || 1));
    }
    purchased.end_date = end;
    purchased.razorpay_payment_id = razorpay_payment_id;
    purchased.payment_date = new Date();

    await purchased.save();

    return res.status(200).json({ status: "true", success: true, message: "Payment verified" });
  } catch (error) {
    console.error("🔥 Verification Error:", error);
    return res.status(500).json({ status: "false", message: "Verification failed" });
  }
};

/* ---------------------------------------------------
4️⃣ GET CURRENT CARD
GET /api/v1/membership-card/my-card
--------------------------------------------------- */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user.id;

    const card = await PurchasedMemberCard
      .findOne({
        user_id: userId,
        payment_status: 2,
        card_status: 1
      })
      .sort({ created_at: -1 })
      .populate("membership_card_id");

    // Default Guest Fallback
    if (!card || !card.membership_card_id) {
      return res.status(200).json({
        status: "true",
        success: true,
        data: {
          id: 1,
          membership_card_name: "Guest",
          membership_card_id: 1,
          membership_card_price: "0"
        }
      });
    }

    const plan = card.membership_card_id;

    return res.status(200).json({
      status: "true",
      success: true,
      data: {
        // Ensure strictly Numeric IDs for Flutter's "int" fields
        id: toInt(plan.sql_id) || 1,
        membership_card_name: toString(plan.name),
        membership_card_id: toInt(plan.sql_id) || 1,
        membership_card_price: toString(plan.price)
      }
    });
  } catch (error) {
    console.error("🔥 My Card Error:", error);
    return res.status(500).json({ status: "false", message: "Failed to fetch card" });
  }
};