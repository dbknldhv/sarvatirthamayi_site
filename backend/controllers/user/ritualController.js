const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Ritual = require("../../models/Ritual");
const RitualPackage = require("../../models/RitualPackage");
const RitualBooking = mongoose.models.RitualBooking || require("../../models/RitualBooking");
const Temple = mongoose.models.Temple || require("../../models/Temple");

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const formatImageUrl = (imgPath) => {
  if (!imgPath) return "";
  if (imgPath.startsWith("http")) return imgPath;
  const baseUrl = "https://api.sarvatirthamayi.com/";
  const cleanPath = imgPath.replace(/\\/g, "/");
  return `${baseUrl}${cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath}`;
};

exports.getRitualsByTemple = async (req, res) => {
  try {
    const templeId = req.body.temple_id || req.body.templeId || req.query.temple_id || req.query.templeId;

    if (!templeId) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "temple_id is required",
      });
    }

    const temple = await Temple.findOne({
      $or: [
        { sql_id: Number(templeId) },
        { _id: mongoose.isValidObjectId(templeId) ? templeId : null },
      ],
    }).lean();

    const rituals = await Ritual.find({
      temple_id: temple?._id,
      status: 1,
    })
      .sort({ sequence: 1, created_at: -1 })
      .lean();

    const formatted = rituals.map((r) => ({
      id: Number(r.sql_id) || 0,
      name: String(r.name || ""),
      description: String(r.description || ""),
      temple_id: Number(temple?.sql_id || templeId || 0),
      temple_name: String(temple?.name || ""),
      image: formatImageUrl(r.image),
      image_thumb: formatImageUrl(r.image),
      devotees_booked_count: 0,
      is_favorite: 0,
      address: temple?.address
        ? {
            full_address: temple.address.full_address || "",
            address_line1: temple.address.address_line1 || "",
            address_line2: temple.address.address_line2 || "",
            landmark: temple.address.landmark || "",
            city: temple.address.city || "",
            state: temple.address.state || "",
            pincode: temple.address.pincode || "",
            country: temple.address.country || "",
            latitude: temple.address.latitude || "",
            longitude: temple.address.longitude || "",
            address_url: temple.address.address_url || "",
          }
        : null,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Rituals fetched successfully",
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
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

exports.getRitualShow = async (req, res) => {
  try {
    const ritualId = req.body.ritual_id || req.body.ritualId || req.query.ritual_id || req.query.ritualId;
    const templeId = req.body.temple_id || req.body.templeId || req.query.temple_id || req.query.templeId;

    const ritual = await Ritual.findOne({
      $or: [
        { sql_id: Number(ritualId) },
        { _id: mongoose.isValidObjectId(ritualId) ? ritualId : null },
      ],
      status: 1,
    }).populate("temple_id");

    if (!ritual) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Ritual not found",
      });
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Ritual details fetched successfully",
      data: {
        id: Number(ritual.sql_id) || 0,
        temple_id: Number(ritual.temple_id?.sql_id || templeId || 0),
        temple_name: String(ritual.temple_id?.name || ""),
        name: String(ritual.name || ""),
        description: String(ritual.description || ""),
        image: formatImageUrl(ritual.image),
        image_thumb: formatImageUrl(ritual.image),
        devotees_booked_count: 0,
        is_favorite: 0,
        address: ritual.temple_id?.address
          ? {
              full_address: ritual.temple_id.address.full_address || "",
              address_line1: ritual.temple_id.address.address_line1 || "",
              address_line2: ritual.temple_id.address.address_line2 || "",
              landmark: ritual.temple_id.address.landmark || "",
              city: ritual.temple_id.address.city || "",
              state: ritual.temple_id.address.state || "",
              pincode: ritual.temple_id.address.pincode || "",
              country: ritual.temple_id.address.country || "",
              latitude: ritual.temple_id.address.latitude || "",
              longitude: ritual.temple_id.address.longitude || "",
              address_url: ritual.temple_id.address.address_url || "",
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

exports.getRitualPackages = async (req, res) => {
  try {
    const ritualId = req.query.ritual_id || req.query.ritualId || req.body.ritual_id || req.body.ritualId;

    const ritual = await Ritual.findOne({
      $or: [
        { sql_id: Number(ritualId) },
        { _id: mongoose.isValidObjectId(ritualId) ? ritualId : null },
      ],
      status: 1,
    });

    if (!ritual) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Ritual not found",
      });
    }

    const packages = await RitualPackage.find({
      ritual_id: ritual._id,
      status: 1,
    })
      .sort({ created_at: 1 })
      .lean();

    const formatted = packages.map((pkg) => ({
      id: Number(pkg.sql_id) || 0,
      ritual_id: Number(ritual.sql_id) || 0,
      temple_id: 0,
      name: String(pkg.name || ""),
      description: String(pkg.description || ""),
      devotees_count: Number(pkg.devotees_count || 1),
      price: String(pkg.price || 0),
      offer_price: String(pkg.price || 0),
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Ritual packages fetched successfully",
      data: {
        data: formatted,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

exports.createRitualOrder = async (req, res) => {
  try {
    const source = { ...req.body, ...req.query };

    const templeId = source.templeId || source.temple_id;
    const ritualId = source.ritualId || source.ritual_id;
    const ritualPackageId = source.ritualPackageId || source.ritual_package_id;
    const date = source.date;
    const whatsAppNumber = source.whatsAppNumber || source.whatsapp_number;
    const devoteeName = source.devoteeName || source.devotees_name;
    const paymentType = Number(source.paymentType || 2);
    const transactionId = source.transactionId || "";
    const wish = source.wish || "";
    const offerId = source.offerId || null;

    if (!templeId || !ritualId || !ritualPackageId || !date || !whatsAppNumber || !devoteeName) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Required booking fields are missing",
      });
    }

    const [templeDoc, ritualDoc, pkg] = await Promise.all([
      Temple.findOne({
        $or: [
          { sql_id: Number(templeId) },
          { _id: mongoose.isValidObjectId(templeId) ? templeId : null },
        ],
      }),
      Ritual.findOne({
        $or: [
          { sql_id: Number(ritualId) },
          { _id: mongoose.isValidObjectId(ritualId) ? ritualId : null },
        ],
      }),
      RitualPackage.findOne({
        $or: [
          { sql_id: Number(ritualPackageId) },
          { _id: mongoose.isValidObjectId(ritualPackageId) ? ritualPackageId : null },
        ],
      }),
    ]);

    if (!templeDoc || !ritualDoc || !pkg) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Temple, ritual, or package not found",
      });
    }

    const amount = Number(pkg.price || 0);
    const rzp = getRazorpayInstance();

    const order = await rzp.orders.create({
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
      ritual_package_id: pkg._id,
      date: new Date(date),
      whatsapp_number: whatsAppNumber,
      devotees_name: devoteeName,
      wish,
      booking_status: 1,
      payment_type: paymentType,
      payment_status: 1,
      razorpay_order_id: order.id,
      transaction_id: transactionId,
      offer_id: offerId,
      offer_discount_amount: 0,
      original_amount: amount,
      paid_amount: amount,
    });

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Ritual booking created successfully",
      data: {
        id: booking.sql_id,
        booking_id: booking.booking_id,
        razorpay_order_id: order.id,
        razorpay_key: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

exports.verifyRitualBooking = async (req, res) => {
  try {
    const source = { ...req.body, ...req.query };

    const razorpay_order_id = source.razorPayOrderId || source.razorpay_order_id;
    const razorpay_payment_id = source.razorPayPaymentId || source.razorpay_payment_id;
    const razorpay_signature = source.razorPaySignature || source.razorpay_signature;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        status: "false",
        message: "Missing payment verification fields",
      });
    }

    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = shasum.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        status: "false",
        message: "Invalid Signature",
      });
    }

    const booking = await RitualBooking.findOne({ razorpay_order_id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        status: "false",
        message: "Booking not found",
      });
    }

    booking.razorpay_payment_id = razorpay_payment_id;
    booking.payment_status = 2;
    booking.booking_status = 2;
    booking.payment_date = new Date();
    booking.updated_at = new Date();

    await booking.save();

    return res.status(200).json({
      success: true,
      status: "true",
      message: "Ritual booking verified successfully",
      data: {
        booking_id: booking.booking_id,
        razorpay_order_id,
        razorpay_payment_id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: "false",
      message: error.message,
    });
  }
};

exports.getMyRitualBookings = async (req, res) => {
  try {
    const bookings = await RitualBooking.find({ user_id: req.user.id })
      .populate("temple_id", "name image")
      .populate("ritual_id", "name image sql_id")
      .populate("ritual_package_id", "name price sql_id")
      .sort({ created_at: -1 })
      .lean();

    const formatted = bookings.map((b) => ({
      id: Number(b.sql_id) || 0,
      booking_id: b.booking_id || "",
      date: b.date,
      whatsapp_number: b.whatsapp_number || "",
      devotees_name: b.devotees_name || "",
      wish: b.wish || "",
      booking_status: b.booking_status || 1,
      payment_status: b.payment_status || 1,
      original_amount: String(b.original_amount || 0),
      paid_amount: String(b.paid_amount || 0),
      created_at: b.created_at,
      temple: b.temple_id
        ? {
            id: Number(b.temple_id.sql_id || 0),
            name: b.temple_id.name || "",
            image: formatImageUrl(b.temple_id.image || ""),
            image_thumb: formatImageUrl(b.temple_id.image || ""),
          }
        : null,
      ritual: b.ritual_id
        ? {
            id: Number(b.ritual_id.sql_id || 0),
            name: b.ritual_id.name || "",
            image: formatImageUrl(b.ritual_id.image || ""),
            image_thumb: formatImageUrl(b.ritual_id.image || ""),
          }
        : null,
      ritual_package: b.ritual_package_id
        ? {
            id: Number(b.ritual_package_id.sql_id || 0),
            name: b.ritual_package_id.name || "",
            price: String(b.ritual_package_id.price || 0),
          }
        : null,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Ritual booking details fetched successfully.",
      data: {
        data: formatted,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};