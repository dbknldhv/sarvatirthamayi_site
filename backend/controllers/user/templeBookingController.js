const TempleBooking = require("../../models/TempleBooking");
const Temple = require("../../models/Temple");
const User = require("../../models/User");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) return null;
    return new Razorpay({ key_id, key_secret });
};

exports.createTempleBookingOrder = async (req, res) => {
    try {
        const { templeId, devoteeName, date, whatsAppNumber, wish, paymentType } = req.body;

        //const temple = await Temple.findOne({ sql_id: templeId });
        const temple = await Temple.findOne({ sql_id: Number(req.body.templeId) });
        if (!temple) {
            return res.status(404).json({ status: "false", success: false, message: "Temple not found" });
        }

        const amountInPaise = parseInt(temple.visit_price || 0) * 100;
        let orderId = `FREE_${Date.now()}`;
        const publicKey = process.env.RAZORPAY_KEY_ID;

        if (amountInPaise > 0) {
            const rzp = getRazorpayInstance();
            if (!rzp) return res.status(500).json({ status: "false", message: "Razorpay Key missing" });
            
            const order = await rzp.orders.create({
                amount: amountInPaise,
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
            original_amount: String(temple.visit_price || "0"),
            paid_amount: String(temple.visit_price || "0"),
            razorpay_order_id: orderId,
            booking_status: 1, 
            payment_status: 1, 
            payment_type: paymentType || 2 
        });
        await newBooking.save();

        // 🎯 EXACT ALIGNMENT WITH temple_booking_model.dart
        res.status(200).json({
            status: "true",
            success: true,
            message: "api.temple_booking",
            data: {
                id: Number(newBooking.sql_id),
                user_id: 0, 
                temple_id: Number(temple.sql_id),
                date: newBooking.date.toISOString(), // Required for DateTime.parse()
                whatsapp_number: String(newBooking.whatsapp_number || ""),
                devotees_name: String(newBooking.devotees_name || ""),
                wish: String(newBooking.wish || ""),
                booking_status: 1,
                offer_discount_amount: "0",
                original_amount: String(temple.visit_price || "0"),
                paid_amount: String(temple.visit_price || "0"),
                created_at: new Date().toISOString(),
                payment: {
                    razorpay_order_id: String(orderId),
                    razorpay_payment_id: "",
                    razorpay_public_key: String(publicKey),
                    payment_status: 1,
                    payment_type: 2,
                    payment_date: "" 
                },
                temple: {
                    id: Number(temple.sql_id),
                    name: String(temple.name || ""),
                    short_description: String(temple.short_description || ""),
                    long_description: String(temple.description || ""),
                    visit_price: String(temple.visit_price || "0"),
                    image: String(temple.image || ""),
                    image_thumb: String(temple.image || ""),
                    address: {
                        full_address: String(temple.full_address || ""),
                        city: String(temple.city_name || ""),
                        state: String(temple.state_name || "")
                    }
                }
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

exports.verifyAndConfirmBooking = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ status: "false", message: "Security verification failed" });
        }

        const booking = await TempleBooking.findOne({ razorpay_order_id }).populate("temple_id");
        if (!booking) return res.status(404).json({ status: "false", message: "Booking record not found" });

        booking.payment_status = 2; 
        booking.booking_status = 2; 
        booking.razorpay_payment_id = razorpay_payment_id;
        booking.payment_date = new Date();
        await booking.save();

        res.status(200).json({
            status: "true",
            success: true,
            message: "Razorpay payment verified successfully.",
            data: {
                id: Number(booking.sql_id),
                user_id: 0,
                temple_id: Number(booking.temple_id?.sql_id || 0),
                date: booking.date.toISOString(),
                whatsapp_number: String(booking.whatsapp_number || ""),
                devotees_name: String(booking.devotees_name || ""),
                wish: String(booking.wish || ""),
                booking_status: 2,
                offer_discount_amount: "0",
                original_amount: String(booking.original_amount || "0"),
                paid_amount: String(booking.paid_amount || "0"),
                created_at: booking.createdAt.toISOString(),
                payment: {
                    razorpay_order_id: String(booking.razorpay_order_id),
                    razorpay_payment_id: String(booking.razorpay_payment_id),
                    razorpay_public_key: String(process.env.RAZORPAY_KEY_ID),
                    payment_status: 2,
                    payment_type: 2,
                    payment_date: booking.payment_date.toISOString()
                },
                temple: {
                    id: Number(booking.temple_id?.sql_id || 0),
                    name: String(booking.temple_id?.name || ""),
                    image: String(booking.temple_id?.image || ""),
                    visit_price: String(booking.temple_id?.visit_price || "0"),
                    address: { full_address: String(booking.temple_id?.full_address || "") }
                }
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await TempleBooking.find({ user_id: req.user.id })
            .populate("temple_id")
            .sort({ date: -1 });

        const formattedBookings = bookings.map(b => ({
            id: Number(b.sql_id || 0),
            user_id: 0,
            temple_id: Number(b.temple_id?.sql_id || 0),
            date: b.date ? b.date.toISOString() : new Date().toISOString(),
            whatsapp_number: String(b.whatsapp_number || ""),
            devotees_name: String(b.devotees_name || ""),
            wish: String(b.wish || ""),
            booking_status: Number(b.booking_status || 1),
            offer_discount_amount: "0",
            original_amount: String(b.original_amount || "0"),
            paid_amount: String(b.paid_amount || "0"),
            created_at: b.createdAt ? b.createdAt.toISOString() : new Date().toISOString(),
            temple: {
                id: Number(b.temple_id?.sql_id || 0),
                name: String(b.temple_id?.name || ""),
                image: String(b.temple_id?.image || ""),
                image_thumb: String(b.temple_id?.image || ""),
                visit_price: String(b.temple_id?.visit_price || "0"),
                short_description: String(b.temple_id?.short_description || "")
            }
        }));

        res.status(200).json({
            status: "true",
            message: "Temple booking details fetched successfully.",
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