const mongoose = require("mongoose");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");
const User = require("../../models/User");
const Membership = require("../../models/Membership");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { generateMembershipCertificate } = require("../../utils/pdfGenerator");
const mailSender = require("../../utils/mailSender");

/**
 * Razorpay Instance Helper
 */
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    status: "false",
    success: false,
    message,
  });
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const getSourceValue = (source, ...keys) => {
  for (const key of keys) {
    if (
      source[key] !== undefined &&
      source[key] !== null &&
      source[key] !== ""
    ) {
      return source[key];
    }
  }
  return null;
};

const findMembershipPlan = async (planId) => {
  if (!planId) return null;

  const numericPlanId = toNumberOrNull(planId);
  const orConditions = [];

  if (numericPlanId !== null) {
    orConditions.push({ sql_id: numericPlanId });
  }

  if (mongoose.isValidObjectId(String(planId))) {
    orConditions.push({ _id: planId });
  }

  if (orConditions.length === 0) return null;

  return Membership.findOne({
    $or: orConditions,
    status: 1,
  });
};

/**
 * 1. Create Razorpay Order for Membership
 * Triggered by Flutter purchase event
 */
exports.createMembershipOrder = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };

    const planId = getSourceValue(
      source,
      "memberShipCardId",
      "membership_card_id",
      "membershipCardId",
      "planId",
      "plan_id",
      "memberShipId"
    );

    if (!planId) {
      return sendError(res, 400, "Membership plan ID is required");
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return sendError(res, 500, "Payment Gateway Config Missing");
    }

    const plan = await findMembershipPlan(planId);
    if (!plan) {
      return sendError(res, 404, "Selected plan not found");
    }

    const options = {
      amount: Math.round(Number(plan.price || 0) * 100),
      currency: "INR",
      receipt: `mem_${plan.sql_id || plan._id}_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);

    // Keep same Flutter message contract
    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_purchase_success",
      data: {
        id: Number(plan.sql_id || 0),
        membership_card_id: Number(plan.sql_id || 0),
        amount: String(plan.price || 0),
        paid_amount: String(plan.price || 0),
        membership_card_amount: String(plan.price || 0),
        payment: {
          razorpay_order_id: String(order.id || ""),
          razorpay_payment_id: "",
          razorpay_public_key: String(process.env.RAZORPAY_KEY_ID || ""),
          payment_status: 1,
          payment_type: 2,
          payment_date: "",
        },
      },
      plan_id: String(plan._id),
    });
  } catch (error) {
    console.error("Membership createMembershipOrder error:", error);
    return sendError(res, 500, error.message);
  }
};

/**
 * 2. Verify Payment & Activate Membership
 * Triggered by Flutter verify event
 */
exports.verifyAndActivateMembership = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };

    const razorpay_payment_id = getSourceValue(
      source,
      "razorPayPaymentId",
      "razorpay_payment_id"
    );
    const razorpay_order_id = getSourceValue(
      source,
      "razorPayOrderId",
      "razorpay_order_id"
    );
    const razorpay_signature = getSourceValue(
      source,
      "razorPaySignature",
      "razorpay_signature"
    );

    const planId = getSourceValue(
      source,
      "plan_id",
      "planId",
      "memberShipCardId",
      "membership_card_id",
      "membershipCardId",
      "memberShipId"
    );

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return sendError(res, 400, "Missing payment verification details");
    }

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return sendError(res, 400, "Invalid Signature");
    }

    let plan = null;

    // Prefer explicit plan_id if Flutter sends it
    if (planId) {
      plan = await findMembershipPlan(planId);
    }

    // Fallback: derive from Razorpay order receipt
    if (!plan) {
      const rzp = getRazorpayInstance();
      if (!rzp) {
        return sendError(res, 500, "Payment Gateway Config Missing");
      }

      const order = await rzp.orders.fetch(razorpay_order_id);
      const receipt = String(order?.receipt || "");

      // receipt format: mem_<sqlId or mongoId>_<timestamp>
      if (receipt.startsWith("mem_")) {
        const parts = receipt.split("_");
        if (parts.length >= 3) {
          const derivedPlanId = parts[1];
          plan = await findMembershipPlan(derivedPlanId);
        }
      }
    }

    if (!plan) {
      return sendError(res, 404, "Plan not found");
    }

    const start_date = new Date();
    const end_date = new Date(start_date);

    if (Number(plan.duration_type) === 2) {
      end_date.setFullYear(end_date.getFullYear() + Number(plan.duration || 1));
    } else {
      end_date.setMonth(end_date.getMonth() + Number(plan.duration || 1));
    }

    const newCard = await PurchasedMemberCard.create({
      user_id: req.user.id,
      membership_card_id: plan._id,
      card_status: 1,
      start_date,
      end_date,
      max_visits: Number(plan.visits || 0),
      used_visits: 0,
      payment_type: 2,
      payment_status: 2,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_date: new Date(),
      membership_card_amount: Number(plan.price || 0),
      paid_amount: Number(plan.price || 0),
      sql_id: Math.floor(100000 + Math.random() * 900000),
      favorite_temples: [],
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { is_member: true, membership: "active" },
      { new: true }
    );

    // Background PDF + mail
    generateMembershipCertificate(newCard, updatedUser)
      .then(async ({ filePath }) => {
        const membershipId = `STM-${newCard._id.toString().slice(-6).toUpperCase()}`;
        await mailSender(
          updatedUser.email,
          "Sovereign Membership Activated",
          `Namaste ${updatedUser.name || "User"}, your membership is active until ${end_date.toDateString()}.`,
          [{ filename: `Certificate_${membershipId}.pdf`, path: filePath }]
        );
      })
      .catch((err) => console.error("Email/PDF Error:", err));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_verify_payment_success",
      data: {
        id: Number(newCard.sql_id || 0),
        membership_card_id: Number(plan.sql_id || 0),
        membership_card_name: String(plan.name || ""),
        membership_card_amount: String(plan.price || 0),
        paid_amount: String(plan.price || 0),
        start_date: start_date.toISOString(),
        end_date: end_date.toISOString(),
        payment: {
          razorpay_order_id: String(razorpay_order_id || ""),
          razorpay_payment_id: String(razorpay_payment_id || ""),
          razorpay_public_key: String(process.env.RAZORPAY_KEY_ID || ""),
          payment_status: 2,
          payment_type: 2,
          payment_date: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Membership verifyAndActivateMembership error:", error);
    return sendError(res, 500, error.message);
  }
};

/**
 * 3. Fetch Active Plans for Buying
 * Triggered by MembershipCardResponse in Flutter
 *
 * Must match Flutter membership list model:
 * id, name, description, visits, price, duration, duration_type, status
 */
exports.getActiveMemberships = async (req, res) => {
  try {
    const plans = await Membership.find({ status: 1 })
      .sort({ price: 1, created_at: 1, _id: 1 })
      .lean();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_card_success",
      data: {
        data: plans.map((plan) => ({
          id: Number(plan.sql_id || 0),
          name: String(plan.name || ""),
          description: String(plan.description || ""),
          visits: Number(plan.visits || 0),
          price: String(plan.price || 0),
          duration: Number(plan.duration || 1),
          duration_type: Number(plan.duration_type || 1),
          status: Number(plan.status || 1),
        })),
        total_count: plans.length,
        is_next: false,
        is_prev: false,
        total_pages: 1,
        current_page: 1,
        per_page: plans.length,
        from: plans.length ? 1 : 0,
        to: plans.length,
        next_page_url: null,
        prev_page_url: null,
        path: req.originalUrl,
        has_pages: false,
        links: [],
      },
    });
  } catch (error) {
    console.error("Membership getActiveMemberships error:", error);
    return sendError(res, 500, error.message);
  }
};

/**
 * 4. Fetch My Purchased Membership Card
 */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const myCard = await PurchasedMemberCard.findOne({
      user_id: req.user.id,
      payment_status: 2,
      card_status: 1,
    })
      .populate("membership_card_id")
      .sort({ created_at: -1, _id: -1 })
      .lean();

    if (!myCard) {
      return res.status(200).json({
        status: "true",
        success: true,
        message: "Membership details fetched successfully",
        data: null,
      });
    }

    const plan = myCard.membership_card_id;

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership details fetched successfully",
      data: {
        id: Number(myCard.sql_id || 0),
        membership_card_id: Number(plan?.sql_id || 0),
        membership_card_name: String(plan?.name || ""),
        membership_card_amount: String(myCard.membership_card_amount || 0),
        paid_amount: String(myCard.paid_amount || 0),
        start_date: myCard.start_date ? new Date(myCard.start_date).toISOString() : null,
        end_date: myCard.end_date ? new Date(myCard.end_date).toISOString() : null,
        payment_status: Number(myCard.payment_status || 0),
        max_visits: Number(myCard.max_visits || 0),
        used_visits: Number(myCard.used_visits || 0),
      },
    });
  } catch (error) {
    console.error("Membership getMyMembershipCard error:", error);
    return sendError(res, 500, error.message);
  }
};