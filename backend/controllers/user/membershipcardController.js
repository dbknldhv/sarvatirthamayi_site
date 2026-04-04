const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Membership = require("../../models/Membership");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");
const PurchasedMemberCardTemple = require("../../models/PurchasedMemberCardTemple");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/* ---------------------------------------------------
HELPERS
--------------------------------------------------- */

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatPrice = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? String(n) : "0";
};

const normalizeTempleItem = (item = {}) => ({
  temple_id: item.templeId ? String(item.templeId) : "",
  name: item.name || "",
  max_visits: toNumber(item.maxVisits),
});

const normalizeMembershipPlanForFlutter = (plan = {}) => ({
  id: plan.sql_id || String(plan._id),
  name: plan.name || "",
  description: plan.description || "",
  visits: toNumber(plan.visits),
  price: formatPrice(plan.price),
  duration: toNumber(plan.duration),
  duration_type: toNumber(plan.duration_type),
  status: toNumber(plan.status),
  temples: Array.isArray(plan.temples)
    ? plan.temples.map(normalizeTempleItem)
    : [],
});

/* ---------------------------------------------------
1️⃣ MEMBERSHIP PLAN LIST
GET /membership-card/index
--------------------------------------------------- */

exports.getActiveMemberships = async (req, res) => {
  try {
    const plans = await Membership.find({ status: 1 })
      .sort({ price: 1 })
      .lean();

    const mapped = plans.map(normalizeMembershipPlanForFlutter);

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_card_success",
      data: {
        data: mapped,
      },
    });
  } catch (error) {
    console.error("Membership Index Error:", error);

    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to load membership plans",
      data: { data: [] },
    });
  }
};

/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP
POST /membership-card/purchase
--------------------------------------------------- */

exports.purchaseMembershipCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const membershipCardId = req.body.membership_card_id;

    const membership = await Membership.findOne({
      $or: [
        { _id: membershipCardId },
        { sql_id: toNumber(membershipCardId) }
      ],
      status: 1
    });

    if (!membership) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Membership plan not found",
      });
    }

    const amount = Math.round(Number(membership.price) * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `mem_${Date.now()}`,
      payment_capture: 1
    });

    const purchased = await PurchasedMemberCard.create({
      user_id: new mongoose.Types.ObjectId(userId),
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
      message: "Membership purchase order created successfully",
      data: {
        purchased_member_card_id: purchased._id,
        razorpay_order_id: razorpayOrder.id,
        amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {

    console.error("Membership Purchase Error:", error);

    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to create membership order"
    });
  }
};

/* ---------------------------------------------------
3️⃣ VERIFY MEMBERSHIP PAYMENT
POST /membership-card/verify-payment
--------------------------------------------------- */

exports.verifyMembershipPayment = async (req, res) => {

  try {

    const userId = req.user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Invalid payment signature"
      });
    }

    const purchased = await PurchasedMemberCard.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      razorpay_order_id
    });

    if (!purchased) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Membership purchase not found"
      });
    }

    const membership = await Membership.findById(
      purchased.membership_card_id
    );

    const now = new Date();

    purchased.payment_status = 2;
    purchased.card_status = 1;
    purchased.start_date = now;
    purchased.end_date = new Date(
      now.setMonth(now.getMonth() + membership.duration)
    );
    purchased.razorpay_payment_id = razorpay_payment_id;

    await purchased.save();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership payment verified successfully"
    });

  } catch (error) {

    console.error("Verify Membership Error:", error);

    return res.status(500).json({
      status: "false",
      success: false,
      message: "Payment verification failed"
    });
  }
};

/* ---------------------------------------------------
4️⃣ GET USER MEMBERSHIP
GET /membership-card/my-card
--------------------------------------------------- */

exports.getMyMembershipCard = async (req, res) => {

  try {

    const userId = req.user.id;

    const card = await PurchasedMemberCard
      .findOne({
        user_id: new mongoose.Types.ObjectId(userId),
        payment_status: 2,
        card_status: 1
      })
      .sort({ createdAt: -1 })
      .populate("membership_card_id");

    /* Guest Fallback */

    if (!card) {
      return res.status(200).json({
        status: "true",
        success: true,
        message: "Membership card fetched successfully",
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
      message: "Membership card fetched successfully",
      data: {
        id: plan.sql_id || 1,
        membership_card_name: plan.name,
        membership_card_id: plan.sql_id || 1,
        membership_card_price: String(plan.price)
      }
    });

  } catch (error) {

    console.error("Get Membership Error:", error);

    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to fetch membership card"
    });
  }
};