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
const calculateRitualPrice = async (userId, packageId, voucherCode = null) => {
    const [pkg, user] = await Promise.all([
        RitualPackage.findById(packageId),
        User.findById(userId)
    ]);

    if (!pkg) throw new Error("Ritual package not found");

    let basePrice = pkg.price || 0;
    let finalPrice = basePrice;
    let discountType = "None";
    let voucherId = null;

    // 1. Apply Membership Discount (0.7%)
    if (user?.status === 1 && user?.membership === "active") {
        finalPrice = basePrice * 0.993; 
        discountType = "Membership (0.7%)";
    }

    // 2. Apply Voucher Discount (If provided)
    if (voucherCode) {
        const voucherResult = await validateVoucher(voucherCode, userId, "ritual", finalPrice);
        finalPrice = voucherResult.finalAmount;
        voucherId = voucherResult.voucherId;
        discountType = discountType === "None" ? "Voucher" : `${discountType} + Voucher`;
    }

    return { 
        basePrice, 
        finalPrice: Number(finalPrice.toFixed(2)), 
        discountType,
        voucherId
    };
};

// --- 1. DATA FETCHING ROUTES ---

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
eexports.createRitualOrder = async (req, res) => {
    try {
        // 🎯 THE FIX: Support both naming styles
        const packageId = req.body.packageId || req.body.ritual_package_id;
        const voucherCode = req.body.voucherCode || req.body.voucher_code;

        if (!packageId) {
            return res.status(400).json({ success: false, message: "packageId is required" });
        }

        const { finalPrice } = await calculateRitualPrice(req.user.id, packageId, voucherCode);

        const rzp = getRazorpayInstance();
        const order = await rzp.orders.create({
            amount: Math.round(finalPrice * 100), 
            currency: "INR",
            receipt: `rit_${Date.now()}`,
        });
        
        res.status(200).json({ 
            success: true, 
            status: "true", // Added for Flutter compatibility
            message: "api.ritual_order_created",
            data: order, 
            finalAmount: finalPrice 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * 💳 VERIFY PAYMENT & FINALISE
 * Confirms payment and "burns" the voucher so it's one-time use.
 */
exports.verifyRitualBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData } = req.body;

        // 🎯 THE COMPATIBILITY FIX: Extract data safely from bookingData regardless of naming style
        const ritualId = bookingData.ritualId || bookingData.ritual_id;
        const packageId = bookingData.packageId || bookingData.ritual_package_id;
        const templeId = bookingData.templeId || bookingData.temple_id;
        const devoteeName = bookingData.devoteeName || bookingData.devotees_name;
        const whatsappNumber = bookingData.whatsappNumber || bookingData.whatsapp_number;
        const bookingDate = bookingData.bookingDate || bookingData.date;
        const voucherCode = bookingData.voucherCode || bookingData.voucher_code;
        const specialWish = bookingData.specialWish || bookingData.wish || "";

        // 1. Security Recalculation (Backend verification of the amount)
        const { finalPrice, basePrice, discountType, voucherId } = await calculateRitualPrice(
            req.user.id, 
            packageId, 
            voucherCode
        );

        // 2. Verify Payment Signature
        const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);

        if (shasum.digest("hex") !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid Payment Signature" });
        }

        // 3. Create Booking Entry
        const newBooking = new RitualBooking({
            sql_id: Math.floor(100000 + Math.random() * 900000),
            booking_id: `RIT-${Date.now()}`,
            user_id: req.user.id,
            ritual_id: ritualId,
            ritual_package_id: packageId,
            temple_id: templeId,
            date: new Date(bookingDate),
            devotees_name: devoteeName,
            whatsapp_number: whatsappNumber,
            wish: specialWish,
            original_amount: basePrice,
            paid_amount: finalPrice,
            discount_type: discountType,
            razorpay_order_id,
            razorpay_payment_id,
            payment_status: 2, 
            booking_status: 2, 
            payment_date: new Date()
        });

        const savedBooking = await newBooking.save();

        // 4. ONE-TIME USE LOCK: Burn the voucher after successful payment
        if (voucherId) {
            await redeemVoucher(voucherId, req.user.id);
        }

        // 5. Fulfillment (PDF & Email)
        const populatedBooking = await RitualBooking.findById(savedBooking._id)
            .populate("ritual_id", "name")
            .populate("temple_id", "name city_name");

        // Generate Receipt
        const fileName = await pdfGenerator.generateRitualReceipt(populatedBooking);
        const receiptPath = path.join(__dirname, "../../public/rituals", fileName);
        
        savedBooking.ticket_url = `/rituals/${fileName}`;
        await savedBooking.save();

        // Send Confirmation Email
        const emailContent = `
            <div style="font-family: sans-serif; padding: 20px; border: 2px solid #7c3aed; border-radius: 15px;">
                <h2 style="color: #7c3aed;">Sacred Ritual Confirmed</h2>
                <p>Pranams <b>${savedBooking.devotees_name}</b>,</p>
                <p>Your ritual <b>${populatedBooking.ritual_id.name}</b> at <b>${populatedBooking.temple_id.name}</b> is confirmed.</p>
                <p><b>Paid:</b> ₹${savedBooking.paid_amount}</p>
                <p>Attached is your sacred receipt.</p>
            </div>
        `;

        await mailSender(
            req.user.email,
            `Ritual Confirmation: ${populatedBooking.ritual_id.name}`,
            emailContent,
            [{ filename: `Receipt_${savedBooking.booking_id}.pdf`, path: receiptPath }]
        );

        res.status(200).json({
            success: true,
            status: "true", // Added for Flutter compatibility
            message: "Ritual Booked Successfully!",
            data: {
                bookingId: savedBooking.booking_id,
                receiptUrl: savedBooking.ticket_url 
            }
        });
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};