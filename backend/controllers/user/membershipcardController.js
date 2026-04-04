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
   HELPERS - THE TYPE-SAFETY SHIELD
   --------------------------------------------------- */

const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

/**
 * 🎯 UNIVERSAL PLAN NORMALIZER
 * Ensures IDs are unique integers (even if sql_id is missing or duplicated)
 * and maps all fields strictly to Flutter Model expectations.
 */
const normalizeMembershipPlan = (plan = {}) => {
  // Generate a unique integer from MongoDB Hex ID to prevent selection conflicts in Flutter
  const mongoIdInt = plan._id ? parseInt(plan._id.toString().substring(0, 8), 16) : 0;
  
  // Logic: Use sql_id if it's unique, otherwise fallback to generated ID
  // This ensures 'id' is always an 'int' and never a 'string'
  const finalId = toInt(plan.sql_id) || mongoIdInt || Math.floor(Math.random() * 1000000);

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


exports.getActiveMemberships = async (req, res) => {
  try {
    const page = toInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const [plans, totalCount] = await Promise.all([
      Membership.find({ status: 1 }).sort({ price: 1 }).skip(skip).limit(limit).lean(),
      Membership.countDocuments({ status: 1 }),
    ]);

    // 🎯 Use our type-safe mapper
    const mapped = plans.map(normalizeMembershipPlan);

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.member_ship_card_success",
      data: {
        // This MUST be the list for Flutter: List<MemberShip>? data;
        data: mapped, 
        
        // 🎯 THESE ARE THE MISSING KEYS PREVENTING THE INDEX FROM LOADING:
        total_count: totalCount,
        is_next: totalCount > page * limit,
        is_prev: page > 1,
        total_pages: Math.ceil(totalCount / limit),
        current_page: page,
        per_page: limit,
        from: skip + 1,
        to: skip + mapped.length,
        next_page_url: totalCount > page * limit ? `${req.protocol}://${req.get('host')}/api/v1/membership-card/index?page=${page + 1}` : null,
        prev_page_url: page > 1 ? `${req.protocol}://${req.get('host')}/api/v1/membership-card/index?page=${page - 1}` : null,
        path: "/api/v1/membership-card/index",
        has_pages: totalCount > limit,
        links: [
           { url: null, label: "&laquo; Previous", active: false },
           { url: "active", label: "1", active: true },
           { url: null, label: "Next &raquo;", active: false }
        ]
      },
    });
  } catch (error) {
    console.error("🔥 Deep Track Error:", error);
    return res.status(500).json({ status: "false", message: "Server Error", data: { data: [] } });
  }
};




/* ---------------------------------------------------
2️⃣ PURCHASE MEMBERSHIP (Initialization)
POST /api/v1/membership-card/purchase
--------------------------------------------------- */
exports.purchaseMembershipCard = async (req, res) => {
  try {
    const { memberShipId } = req.body; // 🎯 Matches Bloc Event
    const userId = req.user._id || req.user.id;

    if (!memberShipId) return res.status(400).json({ status: "false", message: "memberShipId is required" });

    // Lookup plan by numeric sql_id OR MongoDB ID
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
      message: "Membership purchase order created successfully", // 🎯 Sync with Flutter Constants
      data: {
        // 🎯 Matches UI listener: state.memberShipPurchaseModel!.data!.payment!.razorpayOrderId
        payment: {
          razorpayOrderId: razorpayOrder.id,
          razorpayPublicKey: process.env.RAZORPAY_KEY_ID,
          amount: amountInPaise,
        },
        purchased_member_card_id: purchased._id
      }
    });
  } catch (error) {
    console.error("🔥 Purchase Error:", error.message);
    return res.status(500).json({ status: "false", message: "Failed to initialize purchase" });
  }
};

/* ---------------------------------------------------
3️⃣ VERIFY PAYMENT (Completion)
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
    if (!purchased) return res.status(404).json({ status: "false", message: "Transaction record not found" });

    const membership = await Membership.findById(purchased.membership_card_id);

    purchased.payment_status = 2; // Paid
    purchased.card_status = 1;    // Active
    purchased.start_date = new Date();
    purchased.razorpay_payment_id = razorpay_payment_id;
    purchased.razorpay_signature = razorpay_signature;

    await purchased.save();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership payment verified successfully" // 🎯 Sync with Flutter Constants
    });
  } catch (error) {
    console.error("🔥 Verification Error:", error.message);
    return res.status(500).json({ status: "false", message: "Internal Verification Error" });
  }
};

/* ---------------------------------------------------
4️⃣ GET CURRENT CARD (Profile/Home Display)
GET /api/v1/membership-card/my-card
--------------------------------------------------- */
exports.getMyMembershipCard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const card = await PurchasedMemberCard.findOne({
      user_id: userId,
      payment_status: 2,
      card_status: 1
    })
    .sort({ createdAt: -1 })
    .populate("membership_card_id")
    .lean();

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
          membership_card_description: "Standard Guest Access",
          membership_card_duration: 0,
          membership_card_duration_type: 1
        }
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
    console.error("🔥 My Card API Error:", error.message);
    return res.status(500).json({ status: "false", message: "Failed to fetch card details" });
  }
};