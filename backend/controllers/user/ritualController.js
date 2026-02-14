const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const path = require("path");
const pdfGenerator = require("../../utils/pdfGenerator"); // Import your PDF utility

/**
 * 🛠️ DEFENSIVE MODEL LOADING
 * Prevents 'OverwriteModelError' by checking the Mongoose registry first.
 */
const Ritual = mongoose.models.Ritual || require("../../models/Ritual");
const RitualBooking = mongoose.models.RitualBooking || require("../../models/RitualBooking");
const RitualPackage = mongoose.models.RitualPackage || require("../../models/RitualPackage");

/**
 * Razorpay Instance Helper
 */
const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// --- 1. DATA FETCHING ROUTES ---

/**
 * Get all active rituals with populated temple names
 */
exports.getAllRituals = async (req, res) => {
    try {
        const rituals = await Ritual.find({ status: 1 }).populate("temple_id", "name");
        res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get rituals specific to a temple
 */
exports.getRitualsByTemple = async (req, res) => {
    try {
        const rituals = await Ritual.find({ temple_id: req.params.templeId, status: 1 });
        res.status(200).json({ success: true, data: rituals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get ritual details plus all associated packages
 */
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

/**
 * Get unique ritual categories/types
 */
exports.getRitualTypes = async (req, res) => {
    try {
        const types = await Ritual.distinct("type"); 
        res.status(200).json({ success: true, data: types });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 2. PAYMENT & BOOKING LOGIC ---

/**
 * Create Razorpay Order
 */
exports.createRitualOrder = async (req, res) => {
    try {
        const rzp = getRazorpayInstance();
        const order = await rzp.orders.create({
            amount: Math.round(Number(req.body.amount) * 100), // convert to paise
            currency: "INR",
            receipt: `rit_${Date.now()}`,
        });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 💳 VERIFY PAYMENT & GENERATE RECEIPT
 * Verifies Razorpay signature, creates DB record, and generates PDF
 */
exports.verifyRitualBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData } = req.body;

        // 1. Verify Payment Signature
        const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);

        if (shasum.digest("hex") !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid Payment Signature" });
        }

        // 2. Create Booking Entry
        const newBooking = new RitualBooking({
            sql_id: Math.floor(100000 + Math.random() * 900000),
            booking_id: `RIT-${Date.now()}`,
            user_id: req.user.id,
            ritual_id: bookingData.ritualId,
            ritual_package_id: bookingData.packageId,
            temple_id: bookingData.templeId,
            date: new Date(bookingData.bookingDate || bookingData.date),
            devotees_name: bookingData.devoteeName,
            whatsapp_number: bookingData.whatsappNumber,
            wish: bookingData.specialWish || bookingData.wish || "",
            original_amount: bookingData.amount,
            paid_amount: bookingData.amount,
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            payment_status: 2, // 2: Paid
            booking_status: 2, // 2: Confirmed
            payment_date: new Date()
        });

        const savedBooking = await newBooking.save();

        // 3. Populate Data for the Receipt
        // PDF Generator needs names instead of IDs
        const populatedBooking = await RitualBooking.findById(savedBooking._id)
            .populate("ritual_id", "name")
            .populate("temple_id", "name city_name");

        // 4. Generate the Receipt PDF
        // Logic handled in backend/utils/pdfGenerator.js
        const fileName = await pdfGenerator.generateRitualReceipt(populatedBooking);

        // 5. Construct the Public Download URL
        // Ensure app.use('/rituals', express.static(...)) is set in server.js
        const receiptUrl = `${req.protocol}://${req.get("host")}/rituals/${fileName}`;

        res.status(200).json({
            success: true,
            message: "Ritual Booked Successfully!",
            data: {
                bookingId: savedBooking.booking_id,
                receiptUrl: receiptUrl 
            }
        });
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};