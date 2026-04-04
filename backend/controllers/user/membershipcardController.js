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

/**
 * -----------------------------
 * Helpers
 * -----------------------------
 */

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatPrice = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? String(num) : "0";
};

const normalizeTempleItem = (item = {}) => ({
  temple_id: item.templeId ? String(item.templeId) : "",
  name: item.name || "",
  max_visits: toNumber(item.maxVisits, 0),
});

const normalizeMembershipPlanForFlutter = (plan = {}) => ({
  id: toNumber(plan.sql_id || plan.id || 0),
  name: plan.name || "",
  description: plan.description || "",
  visits: toNumber(plan.visits, 0),
  price: formatPrice(plan.price),
  duration: toNumber(plan.duration, 0),
  duration_type: toNumber(plan.duration_type, 0),
  status: toNumber(plan.status, 0),
  temples: Array.isArray(plan.temples)
    ? plan.temples.map(normalizeTempleItem)
    : [],
});

const normalizePurchasedMembershipForFlutter = (
  purchasedCard,
  membershipPlan,
  templeUsage = []
) => {
  const membership = membershipPlan || {};
  const card = purchasedCard || {};

  return {
    id: toNumber(card.sql_id || 0),
    purchased_member_card_id: String(card._id || ""),
    membership_card_id: membership._id ? String(membership._id) : "",
    membership_plan_id: toNumber(membership.sql_id || membership.id || 0),

    name: membership.name || "Guest",
    membership_card_name: membership.name || "Guest",
    description: membership.description || "",
    visits: toNumber(membership.visits, 0),

    membership_card_amount: formatPrice(card.membership_card_amount ?? membership.price ?? 0),
    paid_amount: formatPrice(card.paid_amount ?? 0),
    price: formatPrice(membership.price ?? 0),

    duration: toNumber(membership.duration, 0),
    duration_type: toNumber(membership.duration_type, 0),

    card_status: toNumber(card.card_status, 0),
    payment_status: toNumber(card.payment_status, 0),
    payment_type: toNumber(card.payment_type, 0),

    max_visits: toNumber(card.max_visits, 0),
    used_visits: toNumber(card.used_visits, 0),
    remaining_visits: Math.max(
      0,
      toNumber(card.max_visits, 0) - toNumber(card.used_visits, 0)
    ),

    start_date: card.start_date || null,
    end_date: card.end_date || null,
    payment_date: card.payment_date || null,

    razorpay_order_id: card.razorpay_order_id || "",
    razorpay_payment_id: card.razorpay_payment_id || "",

    temples: Array.isArray(membership.temples)
      ? membership.temples.map((temple) => {
          const usage = templeUsage.find(
            (u) => String(u.temple_id) === String(temple.templeId)
          );

          return {
            temple_id: temple.templeId ? String(temple.templeId) : "",
            name: temple.name || "",
            max_visits: toNumber(temple.maxVisits, 0),
            used_visit: toNumber(usage?.used_visit, 0),
            remaining_visit: Math.max(
              0,
              toNumber(temple.maxVisits, 0) - toNumber(usage?.used_visit, 0)
            ),
          };
        })
      : [],
  };
};

const getExpiryDate = (startDate, duration, durationType) => {
  const start = new Date(startDate);
  const expiry = new Date(start);

  const d = toNumber(duration, 0);
  const type = toNumber(durationType, 0);

  // You can adjust these mappings if your admin panel uses different values:
  // 1 = days, 2 = months, 3 = years
  if (type === 1) {
    expiry.setDate(expiry.getDate() + d);
  } else if (type === 2) {
    expiry.setMonth(expiry.getMonth() + d);
  } else if (type === 3) {
    expiry.setFullYear(expiry.getFullYear() + d);
  } else {
    expiry.setDate(expiry.getDate() + d);
  }

  return expiry;
};

const expireCardIfNeeded = async (cardDoc) => {
  if (!cardDoc) return cardDoc;

  const now = new Date();
  if (
    cardDoc.card_status === 1 &&
    cardDoc.end_date &&
    new Date(cardDoc.end_date).getTime() < now.getTime()
  ) {
    cardDoc.card_status = 0;
    await cardDoc.save();
  }

  return cardDoc;
};

/**
 * -----------------------------
 * 1) Membership Plans Index
 * GET /membership-card/index
 * -----------------------------
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
      },
    });
  } catch (error) {
    console.error("getActiveMemberships error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to load membership plans",
      data: {
        data: [],
      },
    });
  }
};

/**
 * -----------------------------
 * 2) Purchase Membership
 * POST /membership-card/purchase
 * -----------------------------
 * body: { membership_card_id }
 */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const membershipCardId =
      req.body.membership_card_id || req.body.membershipId || req.body.id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Unauthorized",
      });
    }

    if (!membershipCardId) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "membership_card_id is required",
      });
    }

    const membership = await Membership.findOne({
      $or: [
        ...(isValidObjectId(membershipCardId)
          ? [{ _id: toObjectId(membershipCardId) }]
          : []),
        { sql_id: toNumber(membershipCardId, -999999) },
      ],
      status: 1,
    }).lean();

    if (!membership) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Membership plan not found",
      });
    }

    const amountInPaise = Math.round(Number(membership.price || 0) * 100);

    if (amountInPaise <= 0) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Invalid membership amount",
      });
    }

    const receipt = `mem_${Date.now()}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      payment_capture: 1,
    });

    const purchased = await PurchasedMemberCard.create({
      user_id: toObjectId(userId),
      membership_card_id: membership._id,
      card_status: 0,
      start_date: null,
      end_date: null,
      max_visits: toNumber(membership.visits, 0),
      used_visits: 0,
      payment_type: 1,
      payment_status: 1,
      razorpay_order_id: razorpayOrder.id,
      payment_date: null,
      membership_card_amount: Number(membership.price || 0),
      paid_amount: Number(membership.price || 0),
    });

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership purchase order created successfully",
      data: {
        purchased_member_card_id: String(purchased._id),
        membership_card_id: String(membership._id),
        membership_plan_id: toNumber(membership.sql_id || 0),
        razorpay_order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID || "",
      },
    });
  } catch (error) {
    console.error("purchaseMembershipCard error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to create membership order",
    });
  }
};

/**
 * -----------------------------
 * 3) Verify Payment
 * POST /membership-card/verify-payment
 * -----------------------------
 * body:
 * {
 *   razorpay_order_id,
 *   razorpay_payment_id,
 *   razorpay_signature
 * }
 */
exports.verifyMembershipPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Unauthorized",
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Missing Razorpay payment verification fields",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Invalid payment signature",
      });
    }

    const purchased = await PurchasedMemberCard.findOne({
      user_id: toObjectId(userId),
      razorpay_order_id,
    });

    if (!purchased) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Purchased membership record not found",
      });
    }

    const membership = await Membership.findById(purchased.membership_card_id).lean();

    if (!membership) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Membership plan not found",
      });
    }

    const now = new Date();
    const endDate = getExpiryDate(now, membership.duration, membership.duration_type);

    purchased.payment_status = 2;
    purchased.card_status = 1;
    purchased.start_date = now;
    purchased.end_date = endDate;
    purchased.razorpay_payment_id = razorpay_payment_id;
    purchased.payment_date = now;
    purchased.max_visits = toNumber(membership.visits, 0);

    await purchased.save();

    if (Array.isArray(membership.temples) && membership.temples.length > 0) {
      for (const temple of membership.temples) {
        const exists = await PurchasedMemberCardTemple.findOne({
          user_id: toObjectId(userId),
          membership_card_id: membership._id,
          purchased_member_card_id: purchased._id,
          temple_id: temple.templeId,
        });

        if (!exists) {
          await PurchasedMemberCardTemple.create({
            user_id: toObjectId(userId),
            membership_card_id: membership._id,
            purchased_member_card_id: purchased._id,
            temple_id: temple.templeId,
            max_visits: toNumber(temple.maxVisits, 0),
            used_visit: 0,
          });
        }
      }
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership payment verified successfully",
      data: {
        purchased_member_card_id: String(purchased._id),
        razorpay_order_id: purchased.razorpay_order_id || "",
        razorpay_payment_id: purchased.razorpay_payment_id || "",
        payment_status: toNumber(purchased.payment_status, 0),
        card_status: toNumber(purchased.card_status, 0),
        start_date: purchased.start_date,
        end_date: purchased.end_date,
      },
    });
  } catch (error) {
    console.error("verifyMembershipPayment error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to verify membership payment",
    });
  }
};

/**
 * -----------------------------
 * 4) My Membership Card
 * GET /membership-card/my-card
 * -----------------------------
 *
 * This is the most important fix for the
 * "No membership card" issue in Flutter.
 */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Unauthorized",
        data: {},
      });
    }

    let purchasedCard = await PurchasedMemberCard.findOne({
      user_id: toObjectId(userId),
      payment_status: 2,
    })
      .sort({ createdAt: -1, created_at: -1, _id: -1 })
      .populate("membership_card_id")
      .exec();

    if (purchasedCard) {
      purchasedCard = await expireCardIfNeeded(purchasedCard);
    }

    if (!purchasedCard || purchasedCard.card_status !== 1) {
      return res.status(200).json({
        status: "true",
        success: true,
        message: "Membership card fetched successfully",
        data: {
          id: 1,
          membership_card_name: "Guest",
          membership_card_id: 1,
          membership_card_price: "0",
          name: "Guest",
          description: "",
          visits: 0,
          price: "0",
          duration: 0,
          duration_type: 0,
          card_status: 0,
          payment_status: 0,
          max_visits: 0,
          used_visits: 0,
          remaining_visits: 0,
          start_date: null,
          end_date: null,
          temples: [],
        },
      });
    }

    const membership = purchasedCard.membership_card_id;
    const templeUsage = await PurchasedMemberCardTemple.find({
      user_id: toObjectId(userId),
      purchased_member_card_id: purchasedCard._id,
    }).lean();

    const mapped = normalizePurchasedMembershipForFlutter(
      purchasedCard.toObject(),
      membership?.toObject ? membership.toObject() : membership,
      templeUsage
    );

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership card fetched successfully",
      data: mapped,
    });
  } catch (error) {
    console.error("getMyMembershipCard error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Failed to fetch membership card",
      data: {},
    });
  }
};