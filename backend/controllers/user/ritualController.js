const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const path = require("path");
const pdfGenerator = require("../../utils/pdfGenerator");
const mailSender = require("../../utils/mailSender");
const { validateVoucher, redeemVoucher } = require("../../utils/voucherHelper");

/**
 * 🛠️ DEFENSIVE MODEL LOADING
 */
const Ritual = mongoose.models.Ritual || require("../../models/Ritual");
const RitualBooking = mongoose.models.RitualBooking || require("../../models/RitualBooking");
const RitualPackage = mongoose.models.RitualPackage || require("../../models/RitualPackage");
const User = mongoose.models.User || require("../../models/User");

/**
 * Razorpay Instance Helper
 */
const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

/**
 * --- HELPER: Secure Ritual Price Calculation ---
 * Now integrates both Membership (0.7%) and Voucher logic.
 */


// --- 1. DATA FETCHING ROUTES ---
/**
 * --- HELPER: Secure Ritual Price Calculation ---
 * Fixed to search by sql_id to bridge Flutter (Number) and MongoDB (ObjectId)
 */
const calculateRitualPrice = async (userId, packageSqlId, voucherCode = null) => {
    // 🎯 THE FIX: Flutter sends the 'sql_id' (Number), so we use findOne
    const [pkg, user] = await Promise.all([
        RitualPackage.findOne({ sql_id: Number(packageSqlId) }),
        User.findById(userId)
    ]);

    if (!pkg) throw new Error(`Ritual package not found for SQL_ID: ${packageSqlId}`);

    let basePrice = pkg.price || 0;
    let finalPrice = basePrice;
    let discountType = "None";
    let voucherId = null;

    // 1. Apply Membership Discount (0.7%)
    if (user?.status === 1 && user?.membership === "active") {
        finalPrice = basePrice * 0.993; 
        discountType = "Membership (0.7%)";
    }

    // 2. Apply Voucher Discount
    if (voucherCode) {
        const voucherResult = await validateVoucher(voucherCode, userId, "ritual", finalPrice);
        finalPrice = voucherResult.finalAmount;
        voucherId = voucherResult.voucherId;
        discountType = discountType === "None" ? "Voucher" : `${discountType} + Voucher`;
    }

    return { 
        pkg, // 🎯 CRITICAL: Return the package document so the controller has the real ._id
        basePrice, 
        finalPrice: Number(finalPrice.toFixed(2)), 
        discountType,
        voucherId
    };
};
/**
 * Fetch distinct ritual types for filtering/dropdowns
 */
exports.getRitualTypes = async (req, res) => {
    try {
        const types = await Ritual.distinct("type"); 
        res.status(200).json({ 
            success: true, 
            data: types 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch ritual types", 
            error: error.message 
        });
    }
};

exports.getAllRituals = async (req, res) => {
    try {
        const rituals = await Ritual.find({ status: 1 }).populate("temple_id", "name");
        res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRitualsByTemple = async (req, res) => {
    try {
        const rituals = await Ritual.find({ temple_id: req.params.templeId, status: 1 });
        res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRitualDetailsWithPackages = async (req, res) => {
    try {
        const ritual = await Ritual.findById(req.params.ritualId).populate("temple_id");
        if (!ritual) return res.status(404).json({ success: false, message: "Ritual not found" });

        const packages = await RitualPackage.find({ ritual_id: req.params.ritualId, status: 1 });
        
        res.status(200).json({ 
            success: true, 
            data: { ...ritual._doc, packages } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 2. SECURE PAYMENT & BOOKING LOGIC ---

/**
 * Create Razorpay Order
 * Recalculates price including potential voucher discounts.
 */
exports.createRitualOrder = async (req, res) => {
    try {
        const packageId = req.body.packageId || req.body.ritual_package_id;
        const voucherCode = req.body.voucherCode || req.body.voucher_code;

        if (!packageId) return res.status(400).json({ success: false, message: "packageId is required" });

        const { finalPrice } = await calculateRitualPrice(req.user.id, packageId, voucherCode);

        const rzp = getRazorpayInstance();
        const order = await rzp.orders.create({
            amount: Math.round(finalPrice * 100), 
            currency: "INR",
            receipt: `rit_${Date.now()}`,
        });
        
        res.status(200).json({ 
            success: true, 
            status: "true",
            data: order, 
            finalAmount: finalPrice 
        });
    } catch (error) {
        console.error("Order Creation Error:", error.message);
        res.status(500).json({ success: false, message: "Ritual or Package not found" });
    }
};
/**
 * 💳 VERIFY PAYMENT & FINALISE
 * Confirms payment and "burns" the voucher so it's one-time use.
 */
exports.verifyRitualBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const source = req.body.bookingData || req.body;
        
        const ritualSqlId = source.ritualId || source.ritual_id;
        const packageSqlId = source.packageId || source.ritual_package_id;
        const templeSqlId = source.templeId || source.temple_id;

        // 🎯 Find Actual MongoDB Docs using SQL_IDs
        const [ritualDoc, templeDoc] = await Promise.all([
            Ritual.findOne({ sql_id: Number(ritualSqlId) }),
            mongoose.model('Temple').findOne({ sql_id: Number(templeSqlId) })
        ]);

        const { pkg, finalPrice, basePrice, discountType, voucherId } = await calculateRitualPrice(
            req.user.id, 
            packageSqlId, 
            source.voucherCode || source.voucher_code
        );

        // Verify Signature
        const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        if (shasum.digest("hex") !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid Signature" });
        }

        const newBooking = new RitualBooking({
            sql_id: Math.floor(100000 + Math.random() * 900000),
            booking_id: `RIT-${Date.now()}`,
            user_id: req.user.id,
            ritual_id: ritualDoc._id,        // Use Mongo ID
            ritual_package_id: pkg._id,      // Use Mongo ID
            temple_id: templeDoc._id,        // Use Mongo ID
            date: new Date(source.bookingDate || source.date),
            devotees_name: source.devoteeName || source.devotees_name,
            whatsapp_number: source.whatsappNumber || source.whatsapp_number,
            wish: source.specialWish || source.wish || "",
            original_amount: basePrice,
            paid_amount: finalPrice,
            discount_type: discountType,
            razorpay_order_id,
            razorpay_payment_id,
            payment_status: 2, 
            booking_status: 2,
            payment_date: new Date()
        });

        await newBooking.save();
        if (voucherId) await redeemVoucher(voucherId, req.user.id);

        // Fulfillment
        const populatedBooking = await RitualBooking.findById(newBooking._id)
            .populate("ritual_id", "name")
            .populate("temple_id", "name city_name");

        const fileName = await pdfGenerator.generateRitualReceipt(populatedBooking);
        newBooking.ticket_url = `/rituals/${fileName}`;
        await newBooking.save();

        res.status(200).json({
            success: true,
            status: "true",
            message: "Ritual Booked Successfully!",
            data: { bookingId: newBooking.booking_id, receiptUrl: newBooking.ticket_url }
        });
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};