const TempleBooking = require("../../models/TempleBooking");
const Temple = require("../../models/Temple");
const User = require("../../models/User");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const path = require("path");
const mailSender = require("../../utils/mailSender");
const { generateTempleTicket } = require("../../utils/pdfGenerator");
const { validateVoucher, redeemVoucher } = require("../../utils/voucherHelper");

/**
 * Creates a Razorpay instance using environment variables
 */
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) return null;
    return new Razorpay({ key_id, key_secret });
};

/**
 * --- HELPER: Centralized Price Calculation ---
 * Logic Hierarchy: Admin Free Today > Membership Discount (0.7%) > Voucher/Coupon.
 */
const calculatePrice = async (userId, templeId, voucherCode = null) => {
    const [temple, user] = await Promise.all([
        Temple.findById(templeId),
        User.findById(userId)
    ]);

    if (!temple) throw new Error("Temple not found");

    let basePrice = temple.visit_price || 0;
    let finalPrice = basePrice;
    let discountType = "None";
    let membershipSavings = 0;
    let voucherId = null;

    // 1. Admin "Free Today" Logic
    if (temple.is_free_today) {
        finalPrice = 0;
        discountType = "Admin Free Entry";
    } 
    // 2. Membership Discount (0.7%) - Synced with Authorized Badge
    else if (user?.status === 1 && user?.membership === "active") {
        membershipSavings = basePrice * 0.007;
        finalPrice = basePrice - membershipSavings;
        discountType = "Authorized Member (0.7%)";
    }

    // 3. Apply Voucher Discount
    if (voucherCode && finalPrice > 0) {
        const voucherResult = await validateVoucher(voucherCode, userId, "temple", finalPrice);
        finalPrice = voucherResult.finalAmount;
        voucherId = voucherResult.voucherId;
        // Merge labels for the user's receipt transparency
        discountType = discountType === "None" ? "Voucher Applied" : `${discountType} + Voucher`;
    }

    return { 
        basePrice, 
        finalPrice: Number(finalPrice.toFixed(2)), 
        membershipSavings: Number(membershipSavings.toFixed(2)),
        discountApplied: Number((basePrice - finalPrice).toFixed(2)),
        discountType,
        voucherId
    };
};

// --- API: Get price breakdown for Frontend ---
exports.checkBookingPrice = async (req, res) => {
    try {
        const { templeId } = req.params;
        const { voucherCode } = req.query; 
        const result = await calculatePrice(req.user.id, templeId, voucherCode);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- API: Create Razorpay Order ---
exports.createTempleBookingOrder = async (req, res) => {
    try {
        const { templeId, voucherCode } = req.body;
        const { finalPrice } = await calculatePrice(req.user.id, templeId, voucherCode);

        // Safety: If price is ₹0 (Admin free or 100% discount), skip Razorpay
        if (finalPrice === 0) {
            return res.status(200).json({ success: true, isFree: true, amount: 0 });
        }

        const rzp = getRazorpayInstance();
        if (!rzp) return res.status(500).json({ success: false, message: "Razorpay configuration error" });

        const options = {
            amount: Math.round(finalPrice * 100), // Convert to Paise
            currency: "INR",
            receipt: `rcpt_temple_${Date.now()}`,
        };

        const order = await rzp.orders.create(options);
        res.status(200).json({ success: true, data: order, finalAmount: finalPrice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- API: Verify & Save Booking ---
exports.verifyAndConfirmBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData } = req.body;

        if (!bookingData?.templeId || !bookingData?.devoteeName) {
            return res.status(400).json({ status: "false", success: false, message: "Missing required booking information." });
        }

        // 1. Price Calculation & Signature Verification
        const { finalPrice, basePrice, discountType, voucherId } = await calculatePrice(
            req.user.id, 
            bookingData.templeId, 
            bookingData.voucherCode
        );

        if (finalPrice > 0) {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ status: "false", success: false, message: "Security Check: Payment verification failed" });
            }
        }

        // 2. Create Database Record
        const newBooking = new TempleBooking({
            user_id: req.user.id,
            temple_id: bookingData.templeId,
            sql_id: Math.floor(100000 + Math.random() * 900000),
            booking_id: `BK-${Date.now()}`,
            whatsapp_number: String(bookingData.whatsappNumber || ""),
            devotees_name: bookingData.devoteeName,
            wish: bookingData.specialWish || "",
            date: new Date(bookingData.visitDate),
            original_amount: basePrice,
            paid_amount: finalPrice,
            discount_type: discountType,
            payment_status: 2, 
            booking_status: 2, 
            payment_type: finalPrice === 0 ? 1 : 2, 
            razorpay_order_id: razorpay_order_id || "FREE_OR_VOUCHER",
            razorpay_payment_id: razorpay_payment_id || "FREE_OR_VOUCHER",
            payment_date: new Date(),
        });

        const savedBooking = await newBooking.save();
        if (voucherId) await redeemVoucher(voucherId, req.user.id);
        const populatedBooking = await savedBooking.populate("temple_id");

        // 🎯 Format for Flutter (TempleVerifyPaymentModel)
        const formattedData = {
            id: savedBooking.sql_id || 0,
            user_id: 0, 
            temple_id: 0,
            temple: {
                id: populatedBooking.temple_id.sql_id || 0,
                name: populatedBooking.temple_id.name,
                short_description: populatedBooking.temple_id.short_description || "",
                visit_price: String(populatedBooking.temple_id.visit_price),
                image: populatedBooking.temple_id.image,
                image_thumb: populatedBooking.temple_id.image
            },
            date: savedBooking.date.toISOString().split('T')[0], // YYYY-MM-DD
            whatsapp_number: savedBooking.whatsapp_number,
            devotees_name: savedBooking.devotees_name,
            wish: savedBooking.wish,
            booking_status: savedBooking.booking_status,
            payment: {
                razorpay_order_id: savedBooking.razorpay_order_id,
                razorpay_payment_id: savedBooking.razorpay_payment_id,
                razorpay_public_key: process.env.RAZORPAY_KEY_ID,
                payment_status: savedBooking.payment_status,
                payment_type: savedBooking.payment_type,
                payment_date: savedBooking.payment_date.toISOString()
            },
            offer_discount_amount: String(basePrice - finalPrice),
            original_amount: String(basePrice),
            paid_amount: String(finalPrice),
            created_at: savedBooking.createdAt.toISOString()
        };

        res.status(200).json({ 
            status: "true",
            success: true, 
            message: "Razorpay payment verified successfully.", // Matches Constants.templeVerifyBookingSuccessMsg
            data: formattedData 
        });

    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

// --- API: Get User Booking History ---
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await TempleBooking.find({ user_id: req.user.id })
            .populate("temple_id")
            .sort({ date: -1 });

        // 🎯 Format for Flutter (GetTempleBookingModel)
        const formattedBookings = bookings.map(b => ({
            id: b.sql_id || 0,
            temple_id: 0,
            booking_status: b.booking_status,
            payment_status: b.payment_status,
            temple: {
                id: b.temple_id?.sql_id || 0,
                name: b.temple_id?.name || "",
                image: b.temple_id?.image || "",
                visit_price: String(b.temple_id?.visit_price || "0"),
                short_description: b.temple_id?.short_description || ""
            }
        }));

        res.status(200).json({
            status: "true",
            message: "Temple booking details fetched successfully.", // Matches Constants.getTempleBookSuccessMsg
            data: {
                data: formattedBookings,
                total_count: formattedBookings.length,
                is_next: false,
                is_prev: false,
                current_page: 1,
                total_pages: 1
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};
/**
 * Fetch details of a single booking by MongoDB ID
 */
exports.getMyBookingById = async (req, res) => {
    try {
        const booking = await TempleBooking.findOne({ 
            _id: req.params.id, 
            user_id: req.user.id 
        }).populate("temple_id");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking record not found" });
        }
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};