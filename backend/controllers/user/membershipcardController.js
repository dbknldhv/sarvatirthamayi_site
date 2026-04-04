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
   HELPERS - STRICT TYPE CASTING & FALLBACKS
   --------------------------------------------------- */

const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

/**
 * 🎯 THE PERFECT NORMALIZER
 * This version is 100% crash-proof for Flutter.
 */
const normalizeMembershipPlan = (plan = {}) => {
  // 1. Prioritize numeric sql_id. 
  // 2. Fallback to a unique number from the Mongo ID.
  // 3. Last fallback to 0. 
  // This ensures 'id' is ALWAYS an int and NEVER a string.
  const finalId = Number(plan.sql_id) || 
                  (plan._id ? parseInt(plan._id.toString().substring(0, 8), 16) : 0);

  return {
    id: finalId,
    name: String(plan.name || ""),
    description: String(plan.description || ""),
    visits: Number(plan.visits || 0),
    price: String(plan.price || "0"), // String for currency display
    duration: Number(plan.duration || 0),
    duration_type: Number(plan.duration_type || 1),
    status: Number(plan.status || 1),
    temples: Array.isArray(plan.temples)
      ? plan.temples.map((t) => ({
          temple_id: String(t.temple_id || t.templeId || ""),
          name: String(t.temple_name || t.name || "Any Temple"),
          max_visits: Number(t.max_visits || t.maxVisits || 0),
        }))
      : [],
  };
};


/* ---------------------------------------------------
1️⃣ MEMBERSHIP PLAN LIST (With Pagination Support)
GET /api/v1/membership-card/index
--------------------------------------------------- */
exports.getActiveMemberships = async (req, res) => {
  try {
    // Adding basic pagination support for the Bloc's "LoadMore" event
    const page = toInt(req.query.page) || 1;
    const limit = toInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [plans, totalCount] = await Promise.all([
      Membership.find({ status: 1 }).sort({ price: 1 }).skip(skip).limit(limit).lean(),
      Membership.countDocuments({ status: 1 }),
    ]);

    const mapped = plans.map(normalizeMembershipPlan);

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_card_success", // Matches Flutter Constants
      data: {
        data: mapped,
        total_count: totalCount,
        current_page: page,
        per_page: limit,
        next_page_url: totalCount > page * limit ? `${req.baseUrl}${req.path}?page=${page + 1}` : null,
      },
    });
  } catch (error) {
    console.error("🔥 Membership List Error:", error.message);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to load membership plans",
      data: { data: [], total_count: 0 },
    });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP
POST /api/v1/membership-card/purchase
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { membership_card_id } = req.body;

    if (!membership_card_id) return res.status(400).json({ status: "false", message: "membership_card_id is required" });

    // Lookup by Mongo ID or Numeric ID
    const membership = await Membership.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(membership_card_id) ? membership_card_id : new mongoose.Types.ObjectId() },
        { sql_id: toInt(membership_card_id) },
      ],
      status: 1,
    });

    if (!membership) return res.status(404).json({ status: "false", message: "Membership plan not found" });

    const amount = Math.round(Number(membership.price) * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
    });

    const purchased = await PurchasedMemberCard.create({
      user_id: userId,
      membership_card_id: membership._id,
      card_status: 0, // Inactive
      payment_status: 1, // Pending
      max_visits: membership.visits,
      used_visits: 0,
      razorpay_order_id: razorpayOrder.id,
      membership_card_amount: membership.price,
      paid_amount: membership.price,
    });

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership purchase order created successfully", // Matches Flutter Constants
      data: {
        purchased_member_card_id: purchased._id,
        razorpay_order_id: razorpayOrder.id,
        amount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("🔥 Purchase Error:", error.message);
    return res.status(500).json({ status: "false", message: "Failed to create purchase order" });
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
      return res.status(400).json({ status: "false", message: "Invalid payment signature" });
    }

    const purchased = await PurchasedMemberCard.findOne({ razorpay_order_id });
    if (!purchased) return res.status(404).json({ status: "false", message: "Purchase record not found" });

    const membership = await Membership.findById(purchased.membership_card_id);
    if (!membership) return res.status(404).json({ status: "false", message: "Plan details not found" });

    const now = new Date();
    const end = new Date(now);

    // Calculate expiry based on duration type
    if (membership.duration_type === 2) {
      end.setFullYear(end.getFullYear() + (membership.duration || 1));
    } else {
      end.setMonth(end.getMonth() + (membership.duration || 1));
    }

    Object.assign(purchased, {
      payment_status: 2, // Paid
      card_status: 1, // Active
      start_date: now,
      end_date: end,
      razorpay_payment_id,
      razorpay_signature,
      payment_date: new Date(),
    });

    await purchased.save();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership payment verified successfully", // Matches Flutter Constants
    });
  } catch (error) {
    console.error("🔥 Verification Error:", error.message);
    return res.status(500).json({ status: "false", message: "Payment verification failed" });
  }
};

/* ---------------------------------------------------
4️⃣ GET CURRENT CARD
GET /api/v1/membership-card/my-card
--------------------------------------------------- */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const card = await PurchasedMemberCard.findOne({
      user_id: userId,
      payment_status: 2,
      card_status: 1,
    })
      .sort({ created_at: -1 })
      .populate("membership_card_id")
      .lean();

    // Default Guest Fallback if no active card is found
    if (!card || !card.membership_card_id) {
      return res.status(200).json({
        status: "true",
        success: true,
        message: "Membership card fetched successfully",
        data: {
          id: 1,
          membership_card_name: "Guest",
          membership_card_id: 1,
          membership_card_price: "0",
          membership_card_description: "Guest Plan",
          membership_card_duration: 0,
          membership_card_duration_type: 1,
        },
      });
    }

    const plan = card.membership_card_id;

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership card fetched successfully",
      data: {
        id: toInt(plan.sql_id) || toInt(card.sql_id) || 1,
        membership_card_name: toString(plan.name),
        membership_card_id: toInt(plan.sql_id) || 1,
        membership_card_price: toString(plan.price),
        membership_card_description: toString(plan.description),
        membership_card_duration: toInt(plan.duration),
        membership_card_duration_type: toInt(plan.duration_type),
      },
    });
  } catch (error) {
    console.error("🔥 My Card Error:", error.message);
    return res.status(500).json({ status: "false", success: false, message: "Failed to fetch membership card" });
  }
};