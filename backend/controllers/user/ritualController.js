const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const Ritual = require("../../models/Ritual");
const RitualPackage = require("../../models/RitualPackage");
const RitualBooking = mongoose.models.RitualBooking || require("../../models/RitualBooking");
const Temple = mongoose.models.Temple || require("../../models/Temple");
const Favorite = require("../../models/Favorite");
const formatImageUrl = require("../../utils/imageUrl");

const FLUTTER_MESSAGES = {
    ritualListSuccess: "Ritual list fetch successfully",
    ritualShowSuccess: "Ritual fetch successfully",
    ritualPackageSuccess: "Ritual packages fetched successfully",
    ritualBookingSuccess: "Ritual booking successfully.",
    ritualVerifySuccess: "Ritual booking created successfully.",
    ritualBookingDetailsSuccess: "Ritual booking details fetched successfully.",
    unauthorized: "Session expired. Please login again.",
};

/**
 * 🔒 PRODUCTION GUARD: Validates numeric user ID from session
 */
const getAuthUserId = (req) => {
    const id = Number(req.user?.sql_id || req.user?.user_id);
    return (isNaN(id) || id <= 0) ? null : id;
};

const sendError = (res, statusCode, message) =>
    res.status(statusCode).json({
        status: "false",
        success: false,
        message,
    });

/**
 * 🎯 LOOKUP HELPERS
 */
const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const buildLookup = (id) => {
    const numericId = Number(id);
    return {
        $or: [
            ...(!isNaN(numericId) ? [{ sql_id: numericId }] : []),
            ...(isValidObjectId(id) ? [{ _id: id }] : []),
        ],
    };
};

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
        latitude: address.latitude ? String(address.latitude) : "",
        longitude: address.longitude ? String(address.longitude) : "",
        address_url: address.address_url || "",
    };
};

/**
 * 1. GET RITUAL LIST BY TEMPLE
 */
exports.getRitualsByTemple = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return sendError(res, 401, FLUTTER_MESSAGES.unauthorized);

        const source = { ...req.query, ...req.body };
        const templeId = source.temple_id || source.templeId;

        if (!templeId) return sendError(res, 400, "temple_id is required");

        const temple = await Temple.findOne(buildLookup(templeId)).lean();
        if (!temple) return sendError(res, 404, "Temple not found");

        const rituals = await Ritual.find({ temple_id: temple._id, status: 1 })
            .sort({ sequence: 1, created_at: -1 })
            .lean();

        const ritualSqlIds = rituals.map((r) => Number(r.sql_id)).filter(Boolean);

        const favoriteDocs = await Favorite.find({
            user_id: userId,
            type: 2,
            reference_id: { $in: ritualSqlIds },
        }).lean();

        const favoriteSet = new Set(favoriteDocs.map((f) => Number(f.reference_id)));

        const formatted = rituals.map((ritual) => ({
            id: Number(ritual.sql_id) || 0,
            name: String(ritual.name || ""),
            description: String(ritual.description || ""),
            temple_id: Number(temple.sql_id) || 0,
            temple_name: String(temple.name || ""),
            image: formatImageUrl(ritual.image),
            is_favorite: favoriteSet.has(Number(ritual.sql_id)) ? 1 : 0,
            address: buildTempleAddress(temple),
        }));

        return res.status(200).json({
            status: "true",
            success: true,
            message: FLUTTER_MESSAGES.ritualListSuccess,
            data: {
                data: formatted,
                total_count: formatted.length,
                current_page: 1,
                total_pages: 1
            },
        });
    } catch (error) {
        return sendError(res, 500, error.message);
    }
};

/**
 * 2. GET RITUAL SHOW DETAILS
 */
exports.getRitualShow = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return sendError(res, 401, FLUTTER_MESSAGES.unauthorized);

        const source = { ...req.query, ...req.body };
        const ritualId = source.ritual_id || source.ritualId;

        if (!ritualId) return sendError(res, 400, "ritual_id is required");

        const ritual = await Ritual.findOne({ ...buildLookup(ritualId), status: 1 }).lean();
        if (!ritual) return sendError(res, 404, "Ritual not found");

        const temple = await Temple.findById(ritual.temple_id).lean();

        const favouriteExists = await Favorite.exists({
            user_id: userId,
            reference_id: Number(ritual.sql_id) || 0,
            type: 2,
        });

        return res.status(200).json({
            status: "true",
            success: true,
            message: FLUTTER_MESSAGES.ritualShowSuccess,
            data: {
                id: Number(ritual.sql_id) || 0,
                temple_id: Number(temple?.sql_id) || 0,
                temple_name: String(temple?.name || ""),
                name: String(ritual.name || ""),
                description: String(ritual.description || ""),
                image: formatImageUrl(ritual.image),
                is_favorite: favouriteExists ? 1 : 0,
                address: buildTempleAddress(temple),
            },
        });
    } catch (error) {
        return sendError(res, 500, error.message);
    }
};

/**
 * 3. CREATE RITUAL ORDER (RAZORPAY)
 */
exports.createRitualOrder = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return sendError(res, 401, FLUTTER_MESSAGES.unauthorized);

        const source = { ...req.body };
        const { temple_id, ritual_id, ritual_package_id, date, devotees_name, whatsapp_number, wish } = source;

        if (!temple_id || !ritual_id || !ritual_package_id || !date) {
            return sendError(res, 400, "Missing required booking fields");
        }

        const [templeDoc, ritualDoc, packageDoc] = await Promise.all([
            Temple.findOne(buildLookup(temple_id)),
            Ritual.findOne(buildLookup(ritual_id)),
            RitualPackage.findOne(buildLookup(ritual_package_id)),
        ]);

        if (!packageDoc) return sendError(res, 404, "Ritual package not found");

        const amount = Number(packageDoc.price || 0);
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `rit_prod_${Date.now()}`,
        });

        const booking = await RitualBooking.create({
            sql_id: Math.floor(100000 + Math.random() * 900000),
            user_id: userId,
            temple_id: templeDoc._id,
            ritual_id: ritualDoc._id,
            ritual_package_id: packageDoc._id,
            date: new Date(date),
            whatsapp_number: String(whatsapp_number),
            devotees_name: String(devotees_name),
            wish: String(wish || ""),
            booking_status: 1, // Pending
            payment_status: 1, // Unpaid
            razorpay_order_id: order.id,
            original_amount: amount,
            paid_amount: amount,
        });

        return res.status(200).json({
            status: "true",
            success: true,
            message: FLUTTER_MESSAGES.ritualBookingSuccess,
            data: {
                id: Number(booking.sql_id),
                user_id: userId,
                temple_id: Number(templeDoc.sql_id),
                ritual_id: Number(ritualDoc.sql_id),
                payment: {
                    razorpay_order_id: order.id,
                    razorpay_public_key: process.env.RAZORPAY_KEY_ID,
                    payment_status: 1
                }
            }
        });
    } catch (error) {
        return sendError(res, 500, error.message);
    }
};

/**
 * 4. GET MY RITUAL BOOKINGS
 */
exports.getMyRitualBookings = async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return sendError(res, 401, FLUTTER_MESSAGES.unauthorized);

        const bookings = await RitualBooking.find({ user_id: userId })
            .populate("temple_id", "name image sql_id")
            .populate("ritual_id", "name description image sql_id")
            .sort({ created_at: -1 })
            .lean();

        const ritualSqlIds = bookings.map((b) => Number(b.ritual_id?.sql_id)).filter(Boolean);
        const favoriteDocs = await Favorite.find({
            user_id: userId,
            type: 2,
            reference_id: { $in: ritualSqlIds },
        }).lean();

        const favoriteSet = new Set(favoriteDocs.map((f) => Number(f.reference_id)));

        const formatted = bookings.map((b) => ({
            id: Number(b.sql_id || 0),
            temple_id: Number(b.temple_id?.sql_id || 0),
            ritual_id: Number(b.ritual_id?.sql_id || 0),
            booking_status: Number(b.booking_status || 1),
            payment_status: Number(b.payment_status || 1),
            ritual: b.ritual_id ? {
                id: Number(b.ritual_id.sql_id),
                name: b.ritual_id.name,
                description: b.ritual_id.description,
                image: formatImageUrl(b.ritual_id.image),
                is_favorite: favoriteSet.has(Number(b.ritual_id.sql_id)) ? 1 : 0
            } : null,
        }));

        return res.status(200).json({
            status: "true",
            success: true,
            message: FLUTTER_MESSAGES.ritualBookingDetailsSuccess,
            data: { data: formatted, total_count: formatted.length }
        });
    } catch (error) {
        return sendError(res, 500, error.message);
    }
};

/**
 * 5. VERIFY PAYMENT
 */
exports.verifyRitualBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return sendError(res, 400, "Invalid Payment Signature");
        }

        const booking = await RitualBooking.findOneAndUpdate(
            { razorpay_order_id },
            { 
                razorpay_payment_id, 
                payment_status: 2, 
                booking_status: 2, 
                payment_date: new Date() 
            },
            { new: true }
        ).populate("temple_id ritual_id");

        return res.status(200).json({
            status: "true",
            success: true,
            message: FLUTTER_MESSAGES.ritualVerifySuccess,
            data: {
                id: Number(booking.sql_id),
                booking_status: 2,
                payment: {
                    razorpay_order_id: booking.razorpay_order_id,
                    razorpay_payment_id: booking.razorpay_payment_id,
                    payment_status: 2
                }
            }
        });
    } catch (error) {
        return sendError(res, 500, error.message);
    }
};