const TempleBooking = require("../../models/TempleBooking");
const Temple = require("../../models/Temple");
const User = require("../../models/User");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require("../../config/db"); // Ensure SQL connection is here
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
    // Search by sql_id if numeric, otherwise _id
    const query = isNaN(templeId) ? { _id: templeId } : { sql_id: parseInt(templeId) };
    const [temple, user] = await Promise.all([
        Temple.findOne(query),
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
        //const { voucherCode } = req.query; 
        const result = await calculatePrice(req.user.id, templeId, voucherCode);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.createTempleBookingOrder = async (req, res) => {
    try {
        const { templeId, devoteeName, date, whatsAppNumber, wish, paymentType } = req.body;

        const temple = await Temple.findOne({ sql_id: templeId });
        if (!temple) {
            return res.status(404).json({ status: "false", message: "Temple not found" });
        }

        const amount = parseInt(temple.visit_price) * 100;
        let orderId = `FREE_${Date.now()}`;
        const publicKey = process.env.RAZORPAY_KEY_ID;

        if (amount > 0) {
            const razorpayInstance = getRazorpayInstance();
            if (!razorpayInstance) {
                return res.status(500).json({ status: "false", message: "Razorpay configuration missing" });
            }

            const order = await razorpayInstance.orders.create({
                amount,
                currency: "INR",
                receipt: `rcpt_${Date.now()}`
            });
            orderId = order.id;
        }

        const newBooking = new TempleBooking({
            user_id: req.user.id,
            temple_id: temple._id,
            sql_id: Math.floor(100000 + Math.random() * 900000),
            devotees_name: devoteeName,
            whatsapp_number: whatsAppNumber,
            date: new Date(date),
            wish: wish || "",
            original_amount: String(temple.visit_price),
            paid_amount: String(temple.visit_price),
            razorpay_order_id: orderId,
            booking_status: 1, 
            payment_status: amount === 0 ? 2 : 1,
            payment_type: paymentType || 2
        });

        await newBooking.save();

        // 🎯 THE CRITICAL RESPONSE: Matches TempleBookingModel.dart exactly
        res.status(200).json({
            status: "true",
            success: true,
            message: "api.temple_booking", 
            data: {
                id: newBooking.sql_id,
                user_id: 0, // Model expects int?
                temple_id: parseInt(templeId), // Model expects int?
                date: newBooking.date.toISOString(), // Required for DateTime.parse()
                whatsapp_number: newBooking.whatsapp_number,
                devotees_name: newBooking.devotees_name,
                wish: newBooking.wish,
                booking_status: 1,
                offer_discount_amount: "0",
                original_amount: String(temple.visit_price),
                paid_amount: String(temple.visit_price),
                created_at: new Date().toISOString(), // Required for DateTime.parse()
                payment: {
                    razorpay_order_id: orderId,
                    razorpay_payment_id: "",
                    razorpay_public_key: publicKey,
                    payment_status: 1,
                    payment_type: 2,
                    payment_date: "" 
                },
                temple: {
                    id: parseInt(templeId),
                    name: temple.name,
                    image: temple.image || "",
                    visit_price: String(temple.visit_price),
                    address: {
                        full_address: temple.full_address || ""
                    }
                }
            }
        });
    } catch (error) {
        console.error("❌ Order Creation Failed:", error.message);
        res.status(500).json({ status: "false", message: error.message });
    }
};

/**
 * API: Verify & Confirm Payment
 */
exports.verifyAndConfirmBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ status: "false", message: "Security verification failed" });
        }

        // 2. Find and update the pending record
        const booking = await TempleBooking.findOne({ razorpay_order_id });
        if (!booking) {
            return res.status(404).json({ status: "false", message: "Booking record not found" });
        }

        booking.payment_status = 2; // Paid
        booking.booking_status = 2; // Confirmed
        booking.razorpay_payment_id = razorpay_payment_id;
        booking.payment_date = new Date();
        
        await booking.save();
        const populated = await booking.populate("temple_id");

        // 3. Response matches TempleVerifyPaymentModel.dart
        res.status(200).json({
            status: "true",
            success: true,
            message: "Razorpay payment verified successfully.",
            data: {
                id: booking.sql_id,
                date: booking.date.toISOString().split('T')[0],
                devotees_name: booking.devotees_name,
                payment: {
                    razorpay_order_id: booking.razorpay_order_id,
                    razorpay_payment_id: booking.razorpay_payment_id,
                    payment_status: 2
                },
                temple: {
                    name: populated.temple_id.name,
                    image: populated.temple_id.image
                }
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
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