const TempleBooking = require("../../models/TempleBooking");
const Temple = require("../../models/Temple");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mailSender = require("../../utils/mailSender");
const { generateTempleTicket } = require("../../utils/pdfGenerator");

const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) return null;
    return new Razorpay({ key_id, key_secret });
};

// --- HELPER: Centralized Price Calculation ---
const calculatePrice = async (userId, templeId) => {
    const temple = await Temple.findById(templeId);
    if (!temple) throw new Error("Temple not found");

    // 1. Check for previous visits (Only confirmed)
    const previousBookings = await TempleBooking.countDocuments({
        user_id: userId,
        temple_id: templeId,
        booking_status: 2
    });

    const isFirstVisit = previousBookings === 0;
    let basePrice = temple.visit_price || 0;
    let finalPrice = basePrice;
    let discountApplied = 0;
    let discountType = "None";

    // 2. Logic Hierarchy: Free Today > Member Discount > First Visit
    if (temple.is_free_today) {
        finalPrice = 0;
        discountType = "Admin Free Entry";
    } 
    else if (isFirstVisit) {
        discountApplied = basePrice * 0.25; // 25% First Visit Discount
        finalPrice = basePrice - discountApplied;
        discountType = "First Visit (25%)";
    }

    return { basePrice, finalPrice, discountApplied, discountType };
};

// --- API: Get price breakdown for Frontend ---
exports.checkBookingPrice = async (req, res) => {
    try {
        const { templeId } = req.params;
        const result = await calculatePrice(req.user.id, templeId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- API: Create Razorpay Order ---
exports.createTempleBookingOrder = async (req, res) => {
    try {
        const { templeId } = req.body;
        const { finalPrice } = await calculatePrice(req.user.id, templeId);

        if (finalPrice === 0) {
            return res.status(200).json({ success: true, isFree: true, amount: 0 });
        }

        const rzp = getRazorpayInstance();
        if (!rzp) return res.status(500).json({ success: false, message: "Razorpay keys missing" });

        const options = {
            amount: Math.round(finalPrice * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
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
            return res.status(400).json({ success: false, message: "Missing required info." });
        }

        // 1. Backend Price Recalculation (Security check)
        const { finalPrice, basePrice } = await calculatePrice(req.user.id, bookingData.templeId);

        // 2. Signature Verification (Only if not free)
        if (finalPrice > 0) {
            const generated_signature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest("hex");

            if (generated_signature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Payment verification failed" });
            }
        }

        // 3. Create Record
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
            payment_status: finalPrice === 0 ? 2 : 2, // 2 = Paid/Success
            booking_status: 2, // Confirmed
            payment_type: finalPrice === 0 ? 1 : 2, // 1=Free/Cash, 2=Online
            razorpay_order_id: razorpay_order_id || "FREE",
            razorpay_payment_id: razorpay_payment_id || "FREE",
            payment_date: new Date(),
        });

        const savedBooking = await newBooking.save();
        const populatedBooking = await savedBooking.populate("temple_id");

        // 4. PDF Generation & Email
        const ticketFileName = await generateTempleTicket(populatedBooking);
        savedBooking.ticket_url = `/tickets/${ticketFileName}`;
        await savedBooking.save();

        const emailContent = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #7c3aed;">Pranams, ${savedBooking.devotees_name}</h2>
                <p>Your visit to <b>${populatedBooking.temple_id.name}</b> is confirmed.</p>
                <p><b>Date:</b> ${new Date(savedBooking.date).toDateString()}</p>
                <p><b>Amount Paid:</b> ₹${savedBooking.paid_amount}</p>
                <p>Please find your e-ticket attached to this email.</p>
            </div>
        `;

        await mailSender(
            req.user.email,
            `Booking Confirmed: ${populatedBooking.temple_id.name}`,
            emailContent,
            [{ filename: `Ticket_${savedBooking.booking_id}.pdf`, path: `./public/tickets/${ticketFileName}` }]
        );

        res.status(200).json({ success: true, ticketUrl: savedBooking.ticket_url, data: savedBooking });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await TempleBooking.find({ user_id: req.user.id })
            .populate("temple_id", "name image location")
            .sort({ date: -1 });
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyBookingById = async (req, res) => {
    try {
        const booking = await TempleBooking.findOne({ _id: req.params.id, user_id: req.user.id }).populate("temple_id");
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};