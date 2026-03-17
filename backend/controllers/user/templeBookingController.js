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
            return res.status(400).json({ success: false, message: "Missing required enrollment information." });
        }

        // 1. Backend Security Recalculation (Anti-Tamper)
        const { finalPrice, basePrice, discountType, voucherId } = await calculatePrice(
            req.user.id, 
            bookingData.templeId, 
            bookingData.voucherCode
        );

        // 2. Signature Verification (Skip for Free/100% Discounted bookings)
        if (finalPrice > 0) {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Security Check: Payment verification failed" });
            }
        }

        // 3. Create Database Record
        const newBooking = new TempleBooking({
            user_id: req.user.id,
            temple_id: bookingData.templeId,
            sql_id: Math.floor(100000 + Math.random() * 900000),
            booking_id: `BK-${Date.now()}`,
            whatsapp_number: bookingData.whatsappNumber,
            devotees_name: bookingData.devoteeName,
            wish: bookingData.specialWish || "",
            date: new Date(bookingData.visitDate),
            original_amount: basePrice,
            paid_amount: finalPrice,
            discount_type: discountType,
            payment_status: 2, // 2 = Paid/Success
            booking_status: 2, // 2 = Confirmed
            payment_type: finalPrice === 0 ? 1 : 2, // 1=Free/Discounted, 2=Razorpay Online
            razorpay_order_id: razorpay_order_id || "FREE_OR_VOUCHER",
            razorpay_payment_id: razorpay_payment_id || "FREE_OR_VOUCHER",
            payment_date: new Date(),
        });

        const savedBooking = await newBooking.save();

        // 4. ONE-TIME USE LOCK: "Burn" the voucher code for this user only after success
        if (voucherId) {
            await redeemVoucher(voucherId, req.user.id);
        }

        const populatedBooking = await savedBooking.populate("temple_id");

        // 5. Fulfillment: PDF Ticket Generation
        const ticketFileName = await generateTempleTicket(populatedBooking);
        const ticketFilePath = path.join(__dirname, "../../public/tickets", ticketFileName);
        
        savedBooking.ticket_url = `/tickets/${ticketFileName}`;
        await savedBooking.save();

        // 6. Branded Email Confirmation
        const emailContent = `
            <div style="font-family: sans-serif; padding: 25px; border: 2px solid #7c3aed; border-radius: 15px; max-width: 600px;">
                <h2 style="color: #7c3aed;">Sacred Visit Confirmed</h2>
                <p>Pranams, <b>${savedBooking.devotees_name}</b>.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <p><b>Temple:</b> ${populatedBooking.temple_id.name}</p>
                    <p><b>Visit Date:</b> ${new Date(savedBooking.date).toDateString()}</p>
                    <p><b>Amount Paid:</b> ₹${savedBooking.paid_amount}</p>
                    <p><b>Offer Details:</b> ${discountType}</p>
                </div>
                <p>Please find your official E-Ticket attached. Present this at the temple desk upon arrival.</p>
                <p style="color: #64748b; font-size: 11px; margin-top: 30px;">This is an automated confirmation from Sarvatirthamayi Club.</p>
            </div>
        `;

        await mailSender(
            req.user.email,
            `Sacred Visit Confirmation: ${populatedBooking.temple_id.name}`,
            emailContent,
            [{ filename: `Ticket_${savedBooking.booking_id}.pdf`, path: ticketFilePath }]
        );

        res.status(200).json({ 
            success: true, 
            ticketUrl: savedBooking.ticket_url, 
            data: savedBooking 
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Fetch all bookings for the logged-in user
 */
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await TempleBooking.find({ user_id: req.user.id })
            .populate("temple_id", "name image location city_name")
            .sort({ date: -1 });
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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