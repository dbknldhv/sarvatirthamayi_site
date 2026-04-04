const mongoose = require("mongoose");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const PurchasedMemberCard = require("../../models/PurchasedMemberCard");
const PurchasedMemberCardTemple = require("../../models/PurchasedMemberCardTemple");
const CardFavoriteTemple = require("../../models/CardFavoriteTemple");
const User = require("../../models/User");
const Membership = require("../../models/Membership");

const { generateMembershipCertificate } = require("../../utils/pdfGenerator");
const mailSender = require("../../utils/mailSender");

/**
 * --------------------------------
 * Common Response Helpers
 * --------------------------------
 */
const sendError = (res, statusCode, message, extra = {}) => {
  return res.status(statusCode).json({
    status: "false",
    success: false,
    message,
    ...extra,
  });
};

const sendSuccess = (res, message, data = null, extra = {}) => {
  return res.status(200).json({
    status: "true",
    success: true,
    message,
    data,
    ...extra,
  });
};

/**
 * --------------------------------
 * Utility Helpers
 * --------------------------------
 */
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) return null;

  return new Razorpay({ key_id, key_secret });
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const safeString = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

const normalizePriceString = (value) => {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "0";
  return String(n);
};

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const isObjectId = (value) => mongoose.isValidObjectId(String(value));

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

/**
 * Always return positive integer.
 * Prefer sql_id.
 * Fallback to stable numeric value derived from Mongo _id.
 * Final fallback avoids ever returning 0.
 */
const generateStableNumericId = (doc) => {
  if (!doc) return Math.floor(100000 + Math.random() * 900000);

  if (doc.sql_id !== undefined && doc.sql_id !== null && doc.sql_id !== "") {
    const n = Number(doc.sql_id);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  if (doc._id) {
    try {
      const parsed = Math.abs(parseInt(String(doc._id).slice(-6), 16));
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    } catch (error) {
      // ignore and fallback below
    }
  }

  return Math.floor(100000 + Math.random() * 900000);
};

const buildMembershipLookup = (planId) => {
  const orConditions = [];

  const numericPlanId = toNumberOrNull(planId);
  if (numericPlanId !== null) {
    orConditions.push({ sql_id: numericPlanId });
  }

  if (isObjectId(planId)) {
    orConditions.push({ _id: planId });
  }

  return orConditions;
};

const findMembershipPlan = async (planId) => {
  if (!planId) return null;

  const orConditions = buildMembershipLookup(planId);
  if (!orConditions.length) return null;

  return Membership.findOne({
    $or: orConditions,
    status: 1,
  }).lean();
};

const calculateEndDate = (startDate, duration, durationType) => {
  const start = new Date(startDate);
  const end = new Date(start);

  const safeDuration = Number(duration || 1);
  const safeDurationType = Number(durationType || 1);

  if (safeDurationType === 2) {
    end.setFullYear(end.getFullYear() + safeDuration);
  } else {
    end.setMonth(end.getMonth() + safeDuration);
  }

  return end;
};

const normalizeMembershipPlanForFlutter = (plan) => {
  return {
    id: generateStableNumericId(plan),
    name: safeString(plan?.name),
    description: safeString(plan?.description),
    visits: Number(plan?.visits || 0),
    price: normalizePriceString(plan?.price),
    duration: Number(plan?.duration || 1),
    duration_type: Number(plan?.duration_type || 1),
    status: Number(plan?.status || 1),
    temples: Array.isArray(plan?.temples)
      ? plan.temples.map((item) => ({
          temple_id: safeString(item?.templeId || item?.temple_id),
          name: safeString(item?.name),
          max_visits: Number(item?.maxVisits || item?.max_visits || 0),
        }))
      : [],
  };
};

const normalizePurchasedCardForFlutter = (card, plan) => {
  return {
    id: generateStableNumericId(card),
    membership_card_id: generateStableNumericId(plan),
    membership_card_name: safeString(plan?.name),
    membership_card_amount: normalizePriceString(
      card?.membership_card_amount ?? plan?.price ?? 0
    ),
    paid_amount: normalizePriceString(card?.paid_amount ?? plan?.price ?? 0),
    start_date: normalizeDate(card?.start_date),
    end_date: normalizeDate(card?.end_date),
    payment_status: Number(card?.payment_status || 0),
    max_visits: Number(card?.max_visits || 0),
    used_visits: Number(card?.used_visits || 0),
  };
};

const findActivePurchasedMembership = async (userId) => {
  const now = new Date();

  return PurchasedMemberCard.findOne({
    user_id: userId,
    payment_status: 2,
    card_status: 1,
    end_date: { $gte: now },
  })
    .sort({ createdAt: -1, created_at: -1, _id: -1 })
    .populate("membership_card_id")
    .lean();
};

/**
 * --------------------------------
 * 1. Get Active Membership Plans
 * GET /membership-card/index
 * --------------------------------
 */
exports.getActiveMemberships = async (req, res) => {
  try {
    const plans = await Membership.find({ status: 1 })
      .sort({ price: 1, createdAt: 1, created_at: 1, _id: 1 })
      .lean();

    const mappedPlans = plans.map(normalizeMembershipPlanForFlutter);

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_card_success",
      data: {
        data: mappedPlans,
        total_count: mappedPlans.length,
        is_next: false,
        is_prev: false,
        total_pages: 1,
        current_page: 1,
        per_page: mappedPlans.length,
        from: mappedPlans.length ? 1 : 0,
        to: mappedPlans.length,
        next_page_url: null,
        prev_page_url: null,
        path: req.originalUrl,
        has_pages: false,
        links: [],
      },
    });
  } catch (error) {
    console.error("getActiveMemberships error:", error);
    return sendError(res, 500, "Failed to fetch membership plans", {
      error: error.message,
    });
  }
};

/**
 * --------------------------------
 * 2. Create Razorpay Order
 * POST /membership-card/purchase
 * --------------------------------
 */
exports.createMembershipOrder = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };

    const planId = getSourceValue(
      source,
      "memberShipCardId",
      "membership_card_id",
      "membershipCardId",
      "memberShipId",
      "planId",
      "plan_id",
      "id"
    );

    if (!planId) {
      return sendError(res, 400, "Membership plan ID is required");
    }

    if (!req.user || !req.user.id) {
      return sendError(res, 401, "User not authorized");
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return sendError(res, 500, "Payment Gateway Config Missing");
    }

    const plan = await findMembershipPlan(planId);
    if (!plan) {
      return sendError(res, 404, "Selected membership plan not found");
    }

    const planNumericId = generateStableNumericId(plan);
    const planPrice = Number(plan.price || 0);

    if (Number.isNaN(planPrice) || planPrice <= 0) {
      return sendError(res, 400, "Invalid membership plan amount");
    }

    // Prevent duplicate active same-plan purchase
    const existingActive = await findActivePurchasedMembership(req.user.id);
    if (
      existingActive &&
      existingActive.membership_card_id &&
      generateStableNumericId(existingActive.membership_card_id) === planNumericId
    ) {
      return sendError(
        res,
        409,
        "You already have an active membership for this plan"
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(planPrice * 100),
      currency: "INR",
      receipt: `mem_${planNumericId}_${Date.now()}`,
      notes: {
        user_id: safeString(req.user.id),
        membership_plan_id: safeString(planNumericId),
        membership_name: safeString(plan.name),
      },
    });

    return sendSuccess(
      res,
      "api.member_ship_purchase_success",
      {
        id: planNumericId,
        membership_card_id: planNumericId,
        amount: normalizePriceString(planPrice),
        paid_amount: normalizePriceString(planPrice),
        membership_card_amount: normalizePriceString(planPrice),
        payment: {
          razorpay_order_id: safeString(order?.id),
          razorpay_payment_id: "",
          razorpay_public_key: safeString(process.env.RAZORPAY_KEY_ID),
          payment_status: 1,
          payment_type: 2,
          payment_date: "",
        },
      },
      {
        plan_id: safeString(plan._id),
      }
    );
  } catch (error) {
    console.error("createMembershipOrder error:", error);
    return sendError(res, 500, "Failed to create membership order", {
      error: error.message,
    });
  }
};

/**
 * --------------------------------
 * 3. Verify Payment & Activate Membership
 * POST /membership-card/verify-payment
 * --------------------------------
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
      "memberShipId",
      "id"
    );

    if (!req.user || !req.user.id) {
      return sendError(res, 401, "User not authorized");
    }

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return sendError(res, 400, "Missing payment verification details");
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return sendError(res, 500, "Payment Gateway Config Missing");
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return sendError(res, 400, "Invalid Signature");
    }

    // If payment already verified earlier, return same success response
    const existingPayment = await PurchasedMemberCard.findOne({
      razorpay_payment_id,
      payment_status: 2,
    }).lean();

    if (existingPayment) {
      const populatedExisting = await PurchasedMemberCard.findById(
        existingPayment._id
      )
        .populate("membership_card_id")
        .lean();

      const existingPlan = populatedExisting?.membership_card_id || null;

      return sendSuccess(
        res,
        "api.member_ship_verify_payment_success",
        normalizePurchasedCardForFlutter(populatedExisting, existingPlan)
      );
    }

    let plan = null;

    // Prefer explicit plan_id from Flutter
    if (planId) {
      plan = await findMembershipPlan(planId);
    }

    // Fallback: derive membership from Razorpay receipt
    if (!plan) {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        return sendError(res, 500, "Payment Gateway Config Missing");
      }

      const order = await razorpay.orders.fetch(razorpay_order_id);
      const receipt = safeString(order?.receipt);

      if (receipt.startsWith("mem_")) {
        const parts = receipt.split("_");
        if (parts.length >= 3) {
          const derivedPlanId = parts[1];
          plan = await findMembershipPlan(derivedPlanId);
        }
      }
    }

    if (!plan) {
      return sendError(res, 404, "Selected membership plan not found");
    }

    const planNumericId = generateStableNumericId(plan);

    // Prevent duplicate active same-plan purchase
    const existingActive = await findActivePurchasedMembership(req.user.id);
    if (
      existingActive &&
      existingActive.membership_card_id &&
      generateStableNumericId(existingActive.membership_card_id) === planNumericId
    ) {
      return sendError(
        res,
        409,
        "You already have an active membership for this plan"
      );
    }

    const startDate = new Date();
    const endDate = calculateEndDate(
      startDate,
      plan.duration,
      plan.duration_type
    );

    const newCard = await PurchasedMemberCard.create({
      user_id: req.user.id,
      membership_card_id: plan._id,
      card_status: 1,
      start_date: startDate,
      end_date: endDate,
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
      favorite_temples: Array.isArray(plan.temples)
        ? plan.temples
            .map((item) => item?.templeId || item?.temple_id)
            .filter(Boolean)
        : [],
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        is_member: true,
        membership: "active",
      },
      { new: true }
    ).lean();

    // Background PDF/email, do not fail main API if this fails
    Promise.resolve()
      .then(async () => {
        if (!updatedUser?.email) return;

        const { filePath } = await generateMembershipCertificate(
          newCard,
          updatedUser
        );

        const membershipId = `STM-${String(newCard._id)
          .slice(-6)
          .toUpperCase()}`;

        await mailSender(
          updatedUser.email,
          "Sovereign Membership Activated",
          `Namaste ${
            updatedUser.name || updatedUser.first_name || "User"
          }, your membership is active until ${new Date(
            endDate
          ).toDateString()}.`,
          [
            {
              filename: `Certificate_${membershipId}.pdf`,
              path: filePath,
            },
          ]
        );
      })
      .catch((err) => {
        console.error("Membership PDF/Email error:", err);
      });

    return sendSuccess(
      res,
      "api.member_ship_verify_payment_success",
      {
        id: generateStableNumericId(newCard),
        membership_card_id: planNumericId,
        membership_card_name: safeString(plan.name),
        membership_card_amount: normalizePriceString(plan.price),
        paid_amount: normalizePriceString(plan.price),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment: {
          razorpay_order_id: safeString(razorpay_order_id),
          razorpay_payment_id: safeString(razorpay_payment_id),
          razorpay_public_key: safeString(process.env.RAZORPAY_KEY_ID),
          payment_status: 2,
          payment_type: 2,
          payment_date: new Date().toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("verifyAndActivateMembership error:", error);
    return sendError(res, 500, "Failed to verify membership payment", {
      error: error.message,
    });
  }
};

/**
 * --------------------------------
 * 4. Get My Purchased Membership
 * GET /membership-card/my-card
 * --------------------------------
 */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "User not authorized",
      });
    }

    const membership = await PurchasedMemberCard.findOne({
      user_id: userId,
      payment_status: 2,
      card_status: 1,
    })
      .populate("membership_card_id")
      .sort({ created_at: -1, _id: -1 })
      .lean();

    if (!membership) {
      return res.status(200).json({
        status: "true",
        success: true,
        message: "Membership details fetched successfully",
        data: null,
      });
    }

    const plan = membership.membership_card_id || null;

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership details fetched successfully",
      data: {
        id: Number(membership.sql_id || 0),
        membership_card_id: Number(plan?.sql_id || 0),
        membership_card_name: String(plan?.name || ""),
        membership_card_amount: String(
          membership.membership_card_amount || plan?.price || 0
        ),
        paid_amount: String(membership.paid_amount || plan?.price || 0),
        start_date: membership.start_date
          ? new Date(membership.start_date).toISOString()
          : null,
        end_date: membership.end_date
          ? new Date(membership.end_date).toISOString()
          : null,
        payment_status: Number(membership.payment_status || 0),
        max_visits: Number(membership.max_visits || 0),
        used_visits: Number(membership.used_visits || 0),
      },
    });
  } catch (error) {
    console.error("getMyMembershipCard error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Server error",
    });
  }
};