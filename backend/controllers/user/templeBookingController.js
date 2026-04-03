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
        // 🎯 SMART SOURCE: Checks for data in body OR query params
        const source = { ...(req.body.bookingData || {}), ...req.body, ...req.query };

        const templeId = source.templeId || source.temple_id;
        const whatsAppNumber = source.whatsAppNumber || source.whatsapp_number;
        const devoteesName = source.devoteeName || source.devotees_name;
        const { date, wish, paymentType } = source;

        // --- 1. SAFETY CHECK ---
        const numericTempleId = Number(templeId);

        if (!templeId || isNaN(numericTempleId)) {
            console.error(`🛑 Invalid ID. Received Body:`, req.body);
            return res.status(400).json({ 
                status: "false", 
                success: false, 
                message: "Invalid Temple Selection." 
            });
        }

        // --- 2. DATABASE LOOKUP ---
        const temple = await Temple.findOne({ sql_id: numericTempleId });
        if (!temple) {
            return res.status(404).json({ status: "false", success: false, message: "Temple not found." });
        }

        // --- 3. PRICE & RAZORPAY LOGIC ---
        const amountInPaise = Math.round(parseFloat(temple.visit_price || 0) * 100);
        let orderId = `FREE_${Date.now()}`;
        const publicKey = process.env.RAZORPAY_KEY_ID;

        // Only call Razorpay if amount > 0
        if (amountInPaise > 0) {
            const rzp = getRazorpayInstance();
            if (!rzp) return res.status(500).json({ status: "false", message: "Razorpay Configuration Error" });
            
            const order = await rzp.orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: `rcpt_${Date.now()}_${numericTempleId}`
            });
            orderId = order.id;
        }

        // --- 4. CREATE BOOKING RECORD ---
        const newBooking = new TempleBooking({
            user_id: req.user._id || req.user.id,
            temple_id: temple._id,
            sql_id: Math.floor(100000 + Math.random() * 900000),
            devotees_name: devoteesName || "Devotee",
            whatsapp_number: whatsAppNumber,
            date: date ? new Date(date) : new Date(),
            wish: wish || "",
            original_amount: String(temple.visit_price || "0"),
            paid_amount: String(temple.visit_price || "0"),
            razorpay_order_id: orderId,
            booking_status: amountInPaise > 0 ? 1 : 2, // Confirmed immediately if free
            payment_status: amountInPaise > 0 ? 1 : 2, // Paid immediately if free
            payment_type: paymentType || 2 
        });
        
        await newBooking.save();

        // 🎯 IMAGE HELPER for Mobile App
        const fullImageUrl = temple.image 
            ? (temple.image.startsWith('http') ? temple.image : `https://api.sarvatirthamayi.com/${temple.image.replace(/\\/g, '/')}`)
            : "https://api.sarvatirthamayi.com/uploads/default.png";

        // --- 5. MOBILE APP ALIGNMENT ---
        return res.status(200).json({
            status: "true",
            success: true,
            message: "api.temple_booking",
            data: {
                id: Number(newBooking.sql_id),
                user_id: 0, 
                temple_id: Number(temple.sql_id),
                date: newBooking.date.toISOString(),
                whatsapp_number: String(newBooking.whatsapp_number || ""),
                devotees_name: String(newBooking.devotees_name || ""),
                wish: String(newBooking.wish || ""),
                booking_status: newBooking.booking_status,
                offer_discount_amount: "0",
                original_amount: String(temple.visit_price || "0"),
                paid_amount: String(temple.visit_price || "0"),
                created_at: new Date().toISOString(),
                payment: {
                    razorpay_order_id: String(orderId),
                    razorpay_payment_id: "",
                    razorpay_public_key: String(publicKey || ""),
                    payment_status: newBooking.payment_status,
                    payment_type: 2,
                    payment_date: "" 
                },
                temple: {
                    id: Number(temple.sql_id),
                    name: String(temple.name || ""),
                    short_description: String(temple.short_description || ""),
                    visit_price: String(temple.visit_price || "0"),
                    image: String(temple.image || ""),
                    image_thumb: String(temple.image || ""),
                    address: {
                        full_address: String(temple.address_line1 || ""),
                        city: String(temple.city_name || ""),
                        state: String(temple.state_name || "")
                    }
                }
            }
        });

    } catch (error) {
        console.error("🔥 Booking Flow Error:", error);
        return res.status(500).json({ status: "false", message: error.message });
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
                booking_status: 2,
                payment: {
                    razorpay_order_id: String(booking.razorpay_order_id),
                    razorpay_payment_id: String(booking.razorpay_payment_id),
                    payment_status: 2
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
      .sort({ date: -1 })
      .lean();

    const formattedBookings = bookings.map((b) => ({
      id: Number(b.sql_id || 0),
      temple_id: Number(b.temple_id?.sql_id || 0),
      booking_status: Number(b.booking_status || 1),
      payment_status: Number(b.payment_status || 1),
      temple: b.temple_id
        ? {
            id: Number(b.temple_id.sql_id || 0),
            name: String(b.temple_id.name || ""),
            short_description: String(b.temple_id.short_description || ""),
            long_description: String(b.temple_id.long_description || ""),
            mobile_number: String(b.temple_id.mobile_number || ""),
            visit_price: String(b.temple_id.visit_price || "0"),
            address: {
              full_address: String(b.temple_id.address_line1 || ""),
              address_line1: String(b.temple_id.address_line1 || ""),
              address_line2: String(b.temple_id.address_line2 || ""),
              landmark: String(b.temple_id.landmark || ""),
              city: String(b.temple_id.city_name || ""),
              state: String(b.temple_id.state_name || ""),
              pincode: String(b.temple_id.pincode || ""),
              country: String(b.temple_id.country || ""),
              latitude: String(b.temple_id.latitude || ""),
              longitude: String(b.temple_id.longitude || ""),
              address_url: "",
            },
            open_time: String(b.temple_id.open_time || ""),
            close_time: String(b.temple_id.close_time || ""),
            is_favorite: 0,
            devotees_booked_count: 0,
            image: String(b.temple_id.image || ""),
            image_thumb: String(b.temple_id.image || ""),
          }
        : null,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Temple booking details fetched successfully.",
      data: {
        data: formattedBookings,
        total_count: formattedBookings.length,
        is_next: false,
        is_prev: false,
        total_pages: 1,
        current_page: 1,
        per_page: formattedBookings.length,
        from: formattedBookings.length ? 1 : 0,
        to: formattedBookings.length,
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