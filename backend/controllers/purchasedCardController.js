// Add these imports at the top
const User = require("../models/User");
const Membership = require("../models/Membership");
// Ensure this path matches your filename exactly
const PurchasedMemberCard = require("../models/PurchasedMemberCard");

/**
 * 1. Confirm Booking (Create a New Purchase)
 */
exports.confirmBooking = async (req, res) => {
    try {
        const { 
            membership_card_id, 
            birthday, 
            important_date, 
            favorite_temples, 
            amount 
        } = req.body;

        // Fetch the actual membership plan to get the max_visits and other rules
        const plan = await Membership.findById(membership_card_id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Membership plan not found" });
        }

        // Calculate Membership Validity (Default: 1 year)
        const start = new Date();
        const end = new Date();
        end.setFullYear(start.getFullYear() + 1);

        const newPurchase = new PurchasedMemberCard({
            // REQUIRED: Generate a unique sql_id for web purchases
            sql_id: Date.now(), 
            user_id: req.user._id, 
            membership_card_id,
            card_status: 1, 
            start_date: start,
            end_date: end,
            // Dynamic visits from the plan
            max_visits: plan.max_visits || 1, 
            used_visits: 0,
            payment_type: 1, 
            payment_status: 2, // 2 => Paid (Bypassed for Dev/Testing)
            razorpay_order_id: `order_${Math.random().toString(36).substring(7)}`,
            membership_card_amount: amount,
            paid_amount: amount,
            birthday: birthday ? new Date(birthday) : null,
            important_date: important_date ? new Date(important_date) : null,
            favorite_temples: favorite_temples || []
        });

        await newPurchase.save();

        res.status(201).json({ 
            success: true, 
            message: "Membership Booked Successfully!", 
            data: newPurchase 
        });
    } catch (error) {
        // Handle unique constraint errors for sql_id
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Duplicate record error. Please try again." });
        }
        res.status(500).json({ success: false, message: "Error saving purchase", error: error.message });
    }
};

/**
 * 2. Get Single Purchase Detail
 */
exports.getPurchasedCardById = async (req, res) => {
    try {
        const { id } = req.params;
        const purchase = await PurchasedMemberCard.findById(id)
            .populate("membership_card_id")
            .populate("user_id", "name email mobile");

        if (!purchase) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        res.status(200).json({ success: true, data: purchase });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching record", error: error.message });
    }
};

/**
 * 3. Get All My Memberships
 */
exports.getMyPurchasedCards = async (req, res) => {
    try {
        const myCards = await PurchasedMemberCard.find({ user_id: req.user._id })
            .populate("membership_card_id")
            .sort({ created_at: -1 });

        res.status(200).json({ success: true, data: myCards });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching history", error: error.message });
    }
};


/**
 * 4. Get All Purchased Cards (For Admin View)
 */
/**
 * 4. Get All Purchased Cards (For Admin View)
 * UPDATE THIS IN: controllers/purchasedCardController.js
 */
exports.getAllPurchasedCardsAdmin = async (req, res) => {
    try {
        // Fix: Destructure 'search' from req.query so it is defined
        const { cardStatus, paymentStatus, search, page = 1, limit = 10 } = req.query;
        let query = {};

        console.log("Filters received:", { cardStatus, paymentStatus, search });

        // Filter Logic
        if (cardStatus && cardStatus !== "All" && !isNaN(cardStatus)) {
            query.card_status = parseInt(cardStatus);
        }
        if (paymentStatus && paymentStatus !== "All" && !isNaN(paymentStatus)) {
            query.payment_status = parseInt(paymentStatus);
        }

        // Search Logic for Order ID or Payment ID
        if (search && search.trim() !== "") {
            query.$or = [
                { razorpay_order_id: { $regex: search, $options: "i" } },
                { razorpay_payment_id: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const purchases = await PurchasedMemberCard.find(query)
            .populate({
                path: "user_id",
                select: "first_name last_name name email mobile_number" 
            })
            .populate({
                path: "membership_card_id",
                select: "name" 
            })
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const totalRecords = await PurchasedMemberCard.countDocuments(query);

        res.status(200).json({
            success: true,
            data: purchases,
            totalRecords,
            totalPages: Math.ceil(totalRecords / (parseInt(limit) || 10)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};