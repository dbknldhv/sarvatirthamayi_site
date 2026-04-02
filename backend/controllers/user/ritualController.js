const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Ritual = require("../../models/Ritual");
const RitualPackage = require("../../models/RitualPackage");
const RitualBooking = mongoose.models.RitualBooking || require("../../models/RitualBooking");
const Temple = mongoose.models.Temple || require("../../models/Temple");
const formatImageUrl = require("../../utils/imageUrl");

const FLUTTER_MESSAGES = {
  ritualListSuccess: "Ritual list fetch successfully",
  ritualShowSuccess: "Ritual fetch successfully",
  ritualPackageSuccess: "Ritual packages fetched successfully",
  ritualBookingSuccess: "Ritual booking successfully.",
  ritualVerifySuccess: "Ritual booking created successfully.",
  ritualBookingDetailsSuccess: "Ritual booking details fetched successfully.",
};

const getRazorpayInstance = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const getSourceValue = (source, ...keys) => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return null;
};

const sendError = (res, statusCode, message) =>
  res.status(statusCode).json({
    status: "false",
    success: false,
    message,
  });

const buildTempleAddress = (temple) => {
  const address = temple?.address || {};

  return {
    full_address: address.full_address || "",
    address_line1: address.address_line1 || "",
    address_line2: address.address_line2 || "",
    landmark: address.landmark || "",
    city: address.city || "",
    state: address.state || "",
    pincode: address.pincode || "",
    country: address.country || "",
    latitude: address.latitude || "",
    longitude: address.longitude || "",
    address_url: address.address_url || "",
  };
};

const buildTempleLookup = (templeId) => {
  const numericTempleId = toNumberOrNull(templeId);
  return {
    $or: [
      ...(numericTempleId !== null ? [{ sql_id: numericTempleId }] : []),
      ...(isValidObjectId(templeId) ? [{ _id: templeId }] : []),
    ],
  };
};

const buildRitualLookup = (ritualId) => {
  const numericRitualId = toNumberOrNull(ritualId);
  return {
    $or: [
      ...(numericRitualId !== null ? [{ sql_id: numericRitualId }] : []),
      ...(isValidObjectId(ritualId) ? [{ _id: ritualId }] : []),
    ],
  };
};

const buildPackageLookup = (packageId) => {
  const numericPackageId = toNumberOrNull(packageId);
  return {
    $or: [
      ...(numericPackageId !== null ? [{ sql_id: numericPackageId }] : []),
      ...(isValidObjectId(packageId) ? [{ _id: packageId }] : []),
    ],
  };
};

exports.getRitualsByTemple = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };
    const templeId = getSourceValue(source, "temple_id", "templeId");

    if (!templeId) return sendError(res, 400, "temple_id is required");

    const temple = await Temple.findOne(buildTempleLookup(templeId)).lean();
    if (!temple) return sendError(res, 404, "Temple not found");

    const rituals = await Ritual.find({
      temple_id: temple._id,
      status: 1,
    })
      .sort({ sequence: 1, created_at: -1 })
      .lean();

    const formatted = rituals.map((ritual) => ({
      id: Number(ritual.sql_id) || 0,
      name: String(ritual.name || ""),
      description: String(ritual.description || ""),
      temple_id: Number(temple.sql_id) || 0,
      temple_name: String(temple.name || ""),
      image: formatImageUrl(ritual.image),
      image_thumb: formatImageUrl(ritual.image),
      devotees_booked_count: 0,
      is_favorite: 0,
      address: buildTempleAddress(temple),
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: FLUTTER_MESSAGES.ritualListSuccess,
      data: {
        data: formatted,
        total_count: formatted.length,
        is_next: false,
        is_prev: false,
        total_pages: 1,
        current_page: 1,
        per_page: formatted.length,
        from: formatted.length ? 1 : 0,
        to: formatted.length,
        next_page_url: null,
        prev_page_url: null,
        path: req.originalUrl,
        has_pages: false,
        links: [],
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getRitualShow = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };
    const ritualId = getSourceValue(source, "ritual_id", "ritualId");
    const templeId = getSourceValue(source, "temple_id", "templeId");

    if (!ritualId) return sendError(res, 400, "ritual_id is required");

    const ritual = await Ritual.findOne({
      ...buildRitualLookup(ritualId),
      status: 1,
    }).populate("temple_id");

    if (!ritual) return sendError(res, 404, "Ritual not found");

    const temple = ritual.temple_id || null;

    return res.status(200).json({
      status: "true",
      success: true,
      message: FLUTTER_MESSAGES.ritualShowSuccess,
      data: {
        id: Number(ritual.sql_id) || 0,
        temple_id: Number(temple?.sql_id || toNumberOrNull(templeId) || 0),
        temple_name: String(temple?.name || ""),
        name: String(ritual.name || ""),
        description: String(ritual.description || ""),
        image: formatImageUrl(ritual.image),
        image_thumb: formatImageUrl(ritual.image),
        devotees_booked_count: 0,
        is_favorite: 0,
        address: buildTempleAddress(temple),
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getRitualPackages = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };

    const ritualId = getSourceValue(source, "ritual_id", "ritualId");

    if (!ritualId) return sendError(res, 400, "ritual_id is required");

    const ritual = await Ritual.findOne({
      ...buildRitualLookup(ritualId),
      status: 1,
    }).lean();

    if (!ritual) return sendError(res, 404, "Ritual not found");

    const packages = await RitualPackage.find({
      ritual_id: ritual._id,
      status: 1,
    })
      .sort({ created_at: 1, _id: 1 })
      .lean();

    const ritualTempleId = Number(ritual.temple_id || ritual.templeId || 0);

    const formatted = packages.map((pkg) => ({
      id: Number(pkg.sql_id) || 0,
      ritual_id: Number(ritual.sql_id) || 0,
      temple_id: ritualTempleId,
      name: String(pkg.name || ""),
      description: String(pkg.description || ""),
      devotees_count: Number(pkg.devotees_count || 1),
      price: String(pkg.price || 0),
      offer_price: String(pkg.offer_price || pkg.price || 0),
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: FLUTTER_MESSAGES.ritualPackageSuccess,
      data: {
        data: formatted,
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};


exports.createRitualOrder = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };

    const templeId = getSourceValue(source, "temple_id", "templeId");
    const ritualId = getSourceValue(source, "ritual_id", "ritualId");
    const ritualPackageId = getSourceValue(source, "ritual_package_id", "ritualPackageId");
    const date = getSourceValue(source, "date");
    const whatsAppNumber = getSourceValue(source, "whatsAppNumber", "whatsapp_number");
    const devoteeName = getSourceValue(source, "devoteeName", "devotees_name");
    const wish = getSourceValue(source, "wish") || "";
    const offerId = getSourceValue(source, "offerId", "offer_id");
    const paymentType = toNumberOrNull(getSourceValue(source, "paymentType", "payment_type")) || 2;

    if (!templeId || !ritualId || !ritualPackageId || !date || !whatsAppNumber || !devoteeName) {
      return sendError(res, 400, "Required booking fields are missing");
    }

    const [templeDoc, ritualDoc, packageDoc] = await Promise.all([
      Temple.findOne(buildTempleLookup(templeId)),
      Ritual.findOne(buildRitualLookup(ritualId)),
      RitualPackage.findOne(buildPackageLookup(ritualPackageId)),
    ]);

    if (!templeDoc) return sendError(res, 404, "Temple not found");
    if (!ritualDoc) return sendError(res, 404, "Ritual not found");
    if (!packageDoc) return sendError(res, 404, "Ritual package not found");

    if (String(ritualDoc.temple_id) !== String(templeDoc._id)) {
      return sendError(res, 400, "Ritual does not belong to the selected temple");
    }

    if (String(packageDoc.ritual_id) !== String(ritualDoc._id)) {
      return sendError(res, 400, "Package does not belong to the selected ritual");
    }

    if (String(packageDoc.temple_id) !== String(templeDoc._id)) {
      return sendError(res, 400, "Package does not belong to the selected temple");
    }

    const amount = Number(packageDoc.price || 0);
    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rit_${Date.now()}`,
    });

    const booking = await RitualBooking.create({
      sql_id: Math.floor(100000 + Math.random() * 900000),
      booking_id: `RIT-${Date.now()}`,
      user_id: req.user.id,
      temple_id: templeDoc._id,
      ritual_id: ritualDoc._id,
      ritual_package_id: packageDoc._id,
      date: new Date(date),
      whatsapp_number: String(whatsAppNumber),
      devotees_name: String(devoteeName),
      wish: String(wish),
      booking_status: 1,
      payment_type: paymentType,
      payment_status: 1,
      razorpay_order_id: order.id,
      offer_id: offerId ? Number(offerId) : null,
      offer_discount_amount: 0,
      original_amount: amount,
      paid_amount: amount,
      created_at: new Date(),
      updated_at: new Date(),
    });
  return res.status(200).json({
  status: "true",
  success: true,
  message: FLUTTER_MESSAGES.ritualBookingSuccess,
  data: {
    id: Number(booking.sql_id || 0),
    user_id: 0,
    temple_id: Number(templeDoc.sql_id || 0),
    ritual_id: Number(ritualDoc.sql_id || 0),
    ritual_package_id: Number(packageDoc.sql_id || 0),
    date: booking.date ? booking.date.toISOString() : new Date().toISOString(),
    whatsapp_number: String(booking.whatsapp_number || ""),
    devotees_name: String(booking.devotees_name || ""),
    wish: String(booking.wish || ""),
    booking_status: Number(booking.booking_status || 1),
    offer_discount_amount: String(booking.offer_discount_amount || 0),
    original_amount: String(booking.original_amount || 0),
    paid_amount: String(booking.paid_amount || 0),
    offer_id: booking.offer_id ?? null,
    payment: {
      razorpay_order_id: String(order.id || ""),
      razorpay_payment_id: "",
      razorpay_public_key: String(process.env.RAZORPAY_KEY_ID || ""),
      payment_status: Number(booking.payment_status || 1),
      payment_type: Number(booking.payment_type || 2),
      payment_date: ""
    }
  }
});

  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.verifyRitualBooking = async (req, res) => {
  try {
    const source = { ...req.query, ...req.body };

    const razorpay_order_id = getSourceValue(
      source,
      "razorPayOrderId",
      "razorpay_order_id"
    );
    const razorpay_payment_id = getSourceValue(
      source,
      "razorPayPaymentId",
      "razorpay_payment_id"
    );
    const razorpay_signature = getSourceValue(
      source,
      "razorPaySignature",
      "razorpay_signature"
    );

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, 400, "Missing payment verification fields");
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return sendError(res, 400, "Invalid Signature");
    }

    const booking = await RitualBooking.findOne({ razorpay_order_id })
      .populate("temple_id")
      .populate("ritual_id")
      .populate("ritual_package_id");

    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }

    booking.razorpay_payment_id = razorpay_payment_id;
    booking.payment_status = 2;
    booking.booking_status = 2;
    booking.payment_date = new Date();
    booking.updated_at = new Date();

    await booking.save();

    return res.status(200).json({
      status: "true",
      success: true,
      message: FLUTTER_MESSAGES.ritualVerifySuccess,
      data: {
        id: Number(booking.sql_id || 0),
        user_id: 0,
        temple_id: Number(booking.temple_id?.sql_id || 0),
        ritual_id: Number(booking.ritual_id?.sql_id || 0),
        ritual_package_id: Number(booking.ritual_package_id?.sql_id || 0),
        date: booking.date ? booking.date.toISOString() : null,
        whatsapp_number: String(booking.whatsapp_number || ""),
        devotees_name: String(booking.devotees_name || ""),
        wish: String(booking.wish || ""),
        booking_status: Number(booking.booking_status || 2),
        offer_discount_amount: String(booking.offer_discount_amount || 0),
        original_amount: String(booking.original_amount || 0),
        paid_amount: String(booking.paid_amount || 0),
        offer_id: booking.offer_id ?? 0,
        payment: {
          razorpay_order_id: String(booking.razorpay_order_id || ""),
          razorpay_payment_id: String(booking.razorpay_payment_id || ""),
          razorpay_public_key: String(process.env.RAZORPAY_KEY_ID || ""),
          payment_status: Number(booking.payment_status || 2),
          payment_type: Number(booking.payment_type || 2),
          payment_date: booking.payment_date
            ? booking.payment_date.toISOString()
            : null,
        },
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getMyRitualBookings = async (req, res) => {
  try {
    const bookings = await RitualBooking.find({ user_id: req.user.id })
      .populate("temple_id", "name image sql_id")
      .populate("ritual_id", "name description image sql_id")
      .populate("ritual_package_id", "name price sql_id")
      .sort({ created_at: -1, _id: -1 })
      .lean();

    const formatted = bookings.map((booking) => ({
      id: Number(booking.sql_id || 0),
      temple_id: Number(booking.temple_id?.sql_id || 0),
      ritual_id: Number(booking.ritual_id?.sql_id || 0),
      booking_status: Number(booking.booking_status || 1),
      payment_status: Number(booking.payment_status || 1),
      ritual: booking.ritual_id
        ? {
            id: Number(booking.ritual_id.sql_id || 0),
            name: String(booking.ritual_id.name || ""),
            description: String(booking.ritual_id.description || ""),
            image: formatImageUrl(booking.ritual_id.image || ""),
            image_thumb: formatImageUrl(booking.ritual_id.image || ""),
            is_favorite: 0,
          }
        : null,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: FLUTTER_MESSAGES.ritualBookingDetailsSuccess,
      data: {
        data: formatted,
        total_count: formatted.length,
        is_next: false,
        is_prev: false,
        total_pages: 1,
        current_page: 1,
        per_page: formatted.length,
        from: formatted.length ? 1 : 0,
        to: formatted.length,
        next_page_url: null,
        prev_page_url: null,
        path: req.originalUrl,
        has_pages: false,
        links: [],
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};