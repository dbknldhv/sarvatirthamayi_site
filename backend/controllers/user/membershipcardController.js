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
   HELPERS - TYPE SAFETY & MAPPING
   --------------------------------------------------- */

const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

const normalizeMembershipPlan = (plan = {}) => {
  // We use sql_id as the primary integer ID for Flutter
  // If sql_id is missing, we extract a unique int from the MongoDB ObjectId
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
1️⃣ GET ALL MEMBERSHIPS (Matches Bloc + Pagination)
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
      message: "api.member_ship_card_success", // MUST match Constants.memberShipCardSuccessMsg
      data: {
        data: mapped,
        total_count: totalCount,
        is_next: totalCount > page * limit,
        is_prev: page > 1,
        total_pages: Math.ceil(totalCount / limit),
        current_page: page,
        per_page: limit,
        next_page_url: totalCount > page * limit ? `membership-card/index?page=${page + 1}` : null,
        prev_page_url: page > 1 ? `membership-card/index?page=${page - 1}` : null,
        path: req.originalUrl,
        has_pages: totalCount > limit,
        links: []
      },
    });
  } catch (error) {
    console.error("🔥 List Error:", error);
    return res.status(500).json({ status: "false", success: false, message: "Server Error" });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP (Matches Bloc nested structure)
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    const { memberShipId } = req.body; // Flutter Bloc sends 'memberShipId'
    const userId = req.user._id || req.user.id;

    const membership = await Membership.findOne({
      $or: [
        { sql_id: toInt(memberShipId) },
        { _id: mongoose.Types.ObjectId.isValid(memberShipId) ? memberShipId : new mongoose.Types.ObjectId() }
      ],
      status: 1
    });

    if (!membership) return res.status(404).json({ status: "false", message: "Plan not found" });

    const amountInPaise = Math.round(Number(membership.price) * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
    });

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
      message: "Membership purchase order created successfully", // Matches Constants.memberShipPurchaseSuccessMsg
      data: {
        // 🎯 CRITICAL: Matches state.memberShipPurchaseModel!.data!.payment!.razorpayOrderId
        payment: {
          razorpayOrderId: razorpayOrder.id,
          razorpayPublicKey: process.env.RAZORPAY_KEY_ID,
          amount: amountInPaise,
        },
        purchased_member_card_id: purchased._id
      }
    });
  } catch (error) {
    console.error("🔥 Purchase Error:", error);
    return res.status(500).json({ status: "false", message: "Purchase initialization failed" });
  }
};

/* ---------------------------------------------------
3️⃣ VERIFY PAYMENT (Matches Success Flow)
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

    purchased.payment_status = 2; // Paid
    purchased.card_status = 1;    // Active
    purchased.start_date = new Date();
    purchased.razorpay_payment_id = razorpay_payment_id;
    purchased.razorpay_signature = razorpay_signature;

    await purchased.save();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership payment verified successfully" // Matches Constants.memberShipVerifyPaymentSuccessMsg
    });
  } catch (error) {
    return res.status(500).json({ status: "false", message: "Verification Error" });
  }
};