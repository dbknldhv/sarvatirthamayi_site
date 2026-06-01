const User = require("../models/User");
const Membership = require("../models/Membership");
const PurchasedMemberCard = require("../models/PurchasedMemberCard");

/**
 * 1. Confirm Booking
 */
exports.confirmBooking = async (req, res) => {
    try {
        const { membership_card_id, birthday, important_date, favorite_temples, amount } = req.body;
        const plan = await Membership.findById(membership_card_id);
        if (!plan) return res.status(404).json({ success: false, message: "Membership plan not found" });

        const start = new Date();
        const end = new Date();
        if (plan.duration_type === 2) {
            end.setFullYear(start.getFullYear() + plan.duration);
        } else {
            end.setMonth(start.getMonth() + plan.duration);
        }

        const newPurchase = new PurchasedMemberCard({
            sql_id: Date.now(),
            user_id: req.user._id,
            membership_card_id,
            card_status: 1,
            start_date: start,
            end_date: end,
            max_visits: plan.total_visits || 0,
            used_visits: 0,
            payment_type: 1,
            payment_status: 2,
            razorpay_order_id: `order_${Math.random().toString(36).substring(7)}`,
            membership_card_amount: amount,
            paid_amount: amount,
            birthday: birthday ? new Date(birthday) : null,
            important_date: important_date ? new Date(important_date) : null,
            favorite_temples: favorite_temples || []
        });

        await newPurchase.save();
        res.status(201).json({ success: true, message: "Membership Booked Successfully!", data: newPurchase });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: "Duplicate record error." });
        res.status(500).json({ success: false, message: "Error saving purchase", error: error.message });
    }
};

/**
 * 2. Get Single Purchase Detail
 */
exports.getPurchasedCardById = async (req, res) => {
    try {
        const purchase = await PurchasedMemberCard.findById(req.params.id)
            .populate("membership_card_id", "name description")
            .populate("user_id", "name first_name last_name email mobile mobile_number");
        if (!purchase) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, data: purchase });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching record", error: error.message });
    }
};

/**
 * 3. Get All My Memberships (User App)
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
 * 4. Get All Purchased Cards (Admin Panel)
 */
exports.getAllPurchasedCardsAdmin = async (req, res) => {
    try {
        const { cardStatus, paymentStatus, search, name, phone, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitInt = parseInt(limit);

        const pipeline = await PurchasedMemberCard.aggregate([
            {
                $lookup: {
                    from: "users",
                    let: { uId: { $toString: "$user_id" } },
                    pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$uId"] } } }],
                    as: "user_info"
                }
            },
            { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "memberships",
                    localField: "membership_card_id",
                    foreignField: "_id",
                    as: "membership"
                }
            },
            { $unwind: { path: "$membership", preserveNullAndEmptyArrays: true } },
            { $match: { 
                ...(cardStatus && cardStatus !== "All" && { card_status: parseInt(cardStatus) }),
                ...(name && { "user_info.name": { $regex: name, $options: "i" } }),
                ...(phone && { "user_info.mobile_number": { $regex: phone, $options: "i" } })
            }},
            { $sort: { created_at: -1 } },
            { $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limitInt }]
            }}
        ]);

        const result = pipeline[0];
        res.status(200).json({ 
            success: true, 
            data: result.data || [], 
            totalRecords: result.metadata[0]?.total || 0,
            totalPages: Math.ceil((result.metadata[0]?.total || 0) / limitInt)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * 5. Delete Purchased Card
 */
exports.deletePurchasedCard = async (req, res) => {
    try {
        const deleted = await PurchasedMemberCard.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};