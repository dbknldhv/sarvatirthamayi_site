const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Membership = require("../../models/Membership");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/* --- HELPERS --- */
const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

const normalizeMembershipPlan = (plan = {}) => {
  // Use sql_id if available, otherwise generate a unique int from Mongo ID
  const mongoIdInt = plan._id ? parseInt(plan._id.toString().substring(0, 8), 16) : 0;
  const finalId = toInt(plan.sql_id) || mongoIdInt;

  return {
    id: finalId,
    name: toString(plan.name),
    description: toString(plan.description),
    visits: toInt(plan.visits),
    price: toString(plan.price),
    duration: toInt(plan.duration),
    duration_type: toInt(plan.duration_type),
    status: toInt(plan.status),
  };
};

/* ---------------------------------------------------
1️⃣ GET ALL MEMBERSHIPS (Sync with Flutter Strings)
--------------------------------------------------- */
exports.getActiveMemberships = async (req, res) => {
  try {
    const page = toInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const [plans, totalCount] = await Promise.all([
      Membership.find({ status: 1 }).sort({ price: 1 }).skip(skip).limit(limit).lean(),
      Membership.countDocuments({ status: 1 }),
    ]);

    const mapped = plans.map(normalizeMembershipPlan);

    return res.status(200).json({
      status: "true",
      success: true,
      // 🎯 CRITICAL: Matches Constants.memberShipCardSuccessMsg in your strings.dart
      message: "Membership card list fetched successfully", 
      data: {
        data: mapped,
        total_count: totalCount,
        is_next: totalCount > page * limit,
        is_prev: page > 1,
        total_pages: Math.ceil(totalCount / limit),
        current_page: page,
        per_page: limit,
        from: skip + 1,
        to: skip + mapped.length,
        // Bloc uses this to set _hasMore logic
        next_page_url: totalCount > page * limit ? `https://api.sarvatirthamayi.com/api/v1/membership-card/index?page=${page + 1}` : null,
        prev_page_url: page > 1 ? `https://api.sarvatirthamayi.com/api/v1/membership-card/index?page=${page - 1}` : null,
        path: "https://api.sarvatirthamayi.com/api/v1/membership-card/index",
        has_pages: totalCount > limit,
        links: []
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "false", message: "Internal Server Error" });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP (Refactored for Stability)
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    // 🎯 FIX: Capture ID from either possible key name
    const rawId = req.body.membership_card_id || req.body.memberShipId;
    const userId = req.user._id || req.user.id;

    if (!rawId) {
      return res.status(400).json({ status: "false", message: "Membership ID is missing" });
    }

    /**
     * 🎯 DATABASE LOOKUP:
     * We check both the integer sql_id (1) and the MongoDB _id.
     * This prevents the 500 error if the app sends an integer.
     */
    const query = { status: 1 };
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      query._id = rawId;
    } else {
      query.$or = [{ sql_id: toInt(rawId) }, { id: toInt(rawId) }];
    }

    const membership = await Membership.findOne(query);

    if (!membership) {
      console.error(`❌ Plan not found for ID: ${rawId}`);
      return res.status(404).json({ status: "false", message: "Plan not found" });
    }

    // Razorpay Integration
    const amountInPaise = Math.round(Number(membership.price) * 100);
    
    // Safety check: Razorpay fails if amount is 0
    if (amountInPaise <= 0) {
        return res.status(400).json({ status: "false", message: "Invalid plan price" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
    });

    // Create the purchase record
    const purchased = await PurchasedMemberCard.create({
      user_id: userId,
      membership_card_id: membership._id,
      card_status: 0,
      payment_status: 1,
      max_visits: membership.visits,
      razorpay_order_id: razorpayOrder.id,
      paid_amount: membership.price
    });

    return res.status(200).json({
      status: "true",
      success: true,
      // 🎯 MESSAGE SYNC: Matches Constants.memberShipVerifyPaymentSuccessMsg
      message: "Membership card purchased successfully", 
      data: {
        payment: {
          razorpayOrderId: razorpayOrder.id,
          razorpayPublicKey: process.env.RAZORPAY_KEY_ID,
          amount: amountInPaise,
        },
        purchased_member_card_id: purchased._id
      }
    });

  } catch (error) {
    console.error("🔥 Purchase Controller Crash:", error.message);
    return res.status(500).json({ 
      status: "false", 
      message: "Purchase initialization failed",
      error: error.message 
    });
  }
};


/* ---------------------------------------------------
3️⃣ VERIFY PAYMENT (Production Ready & Sync with Flutter)
--------------------------------------------------- */
exports.verifyMembershipPayment = async (req, res) => {
  try {
    /**
     * 🎯 FIX 1: Handle both Snake Case (Postman) and Camel Case (Razorpay Flutter SDK)
     * Flutter usually sends: razorPayPaymentId, razorPayOrderId, razorPaySignature
     */
    const razorpay_order_id = req.body.razorpay_order_id || req.body.razorPayOrderId;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.razorPayPaymentId;
    const razorpay_signature = req.body.razorpay_signature || req.body.razorPaySignature;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        status: "false", 
        message: "Missing required payment verification fields" 
      });
    }

    // Verify HMAC Signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.error("❌ Invalid Signature detected");
      return res.status(400).json({ status: "false", message: "Invalid signature" });
    }

    // Find the record
    const purchased = await PurchasedMemberCard.findOne({ razorpay_order_id });
    if (!purchased) {
      return res.status(404).json({ status: "false", message: "Purchase record not found" });
    }

    // Update Status
    purchased.payment_status = 2; // Paid
    purchased.card_status = 1;    // Active
    purchased.start_date = new Date();
    purchased.razorpay_payment_id = razorpay_payment_id;
    purchased.razorpay_signature = razorpay_signature;

    await purchased.save();

    return res.status(200).json({
      status: "true",
      success: true,
      /**
       * 🎯 FIX 2: Matching Constants.memberShipVerifyPaymentSuccessMsg in strings.dart
       * Based on your strings.dart, this MUST be exactly:
       */
      message: "Membership card purchased successfully" 
    });
  } catch (error) {
    console.error("🔥 verification Error:", error.message);
    return res.status(500).json({ status: "false", message: "Internal Verification Error" });
  }
};

/* ---------------------------------------------------
4️⃣ GET CURRENT CARD (Sync with Home Screen)
--------------------------------------------------- */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const card = await PurchasedMemberCard.findOne({ user_id: userId, payment_status: 2, card_status: 1 })
      .sort({ createdAt: -1 })
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