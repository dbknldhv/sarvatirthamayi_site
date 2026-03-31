const PurchasedMemberCard = require('../../models/PurchasedMemberCard');
const User = require('../../models/User');
const Membership = require('../../models/Membership');
const Temple = require('../../models/Temple');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { generateMembershipCertificate } = require('../../utils/pdfGenerator');
const mailSender = require("../../utils/mailSender");

/**
 * Razorpay Instance Helper
 */
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) return null;
    return new Razorpay({ key_id, key_secret });
};

/**
 * 1. Create Razorpay Order for Membership
 * Triggered by: MembershipPurchaseEvent in Flutter
 */
exports.createMembershipOrder = async (req, res) => {
    try {
        // Flutter sends 'memberShipCardId' in the request body
        const planId = req.body.memberShipCardId || req.body.planId;
        
        if (!planId) {
            return res.status(400).json({ status: "false", success: false, message: "Membership plan ID is required" });
        }

        const rzp = getRazorpayInstance();
        if (!rzp) {
            return res.status(500).json({ status: "false", success: false, message: "Payment Gateway Config Missing" });
        }

        const plan = await Membership.findById(planId);
        if (!plan) {
            return res.status(404).json({ status: "false", success: false, message: "Selected plan not found" });
        }

        const options = {
            amount: Math.round(plan.price * 100), // convert to paise
            currency: "INR",
            receipt: `mem_order_${Date.now()}`,
        };

        const order = await rzp.orders.create(options);
        
        // 🎯 Format to match MemberShipPurchaseModel in Flutter
        res.status(200).json({ 
            status: "true",
            success: true, 
            message: "api.member_ship_purchase_success", // Match Constants.memberShipPurchaseSuccessMsg
            data: order, 
            plan_id: plan._id 
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 2. Verify Payment & Activate Membership
 * Triggered by: MembershipVerifyPaymentEvent in Flutter
 */
exports.verifyAndActivateMembership = async (req, res) => {
    try {
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature, 
            plan_id 
        } = req.body;

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !plan_id) {
            return res.status(400).json({ status: "false", success: false, message: "Missing payment verification details" });
        }

        // Signature Verification
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ status: "false", success: false, message: "Invalid Signature" });
        }

        const plan = await Membership.findById(plan_id);
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        // Calculate Dates
        const start_date = new Date();
        const end_date = new Date();
        if (plan.duration_type === 2) { // Years
            end_date.setFullYear(start_date.getFullYear() + plan.duration);
        } else { // Months
            end_date.setMonth(start_date.getMonth() + plan.duration);
        }

        // Create Record
        const newCard = await PurchasedMemberCard.create({
            user_id: req.user.id,
            membership_card_id: plan._id,
            card_status: 1,
            start_date,
            end_date,
            max_visits: plan.visits,
            payment_status: 2, // Paid
            razorpay_order_id,
            razorpay_payment_id,
            membership_card_amount: plan.price,
            paid_amount: plan.price,
            sql_id: Math.floor(100000 + Math.random() * 900000)
        });

        // Sync User status
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            { is_member: true, membership: "active" }, 
            { new: true }
        );

        // Background: Generate PDF and Email (Don't await to keep response fast)
        generateMembershipCertificate(newCard, updatedUser).then(async ({ filePath }) => {
            const membershipId = `STM-${newCard._id.toString().slice(-6).toUpperCase()}`;
            await mailSender(
                updatedUser.email,
                "Sovereign Membership Activated",
                ` Namaste ${updatedUser.name}, your membership is active until ${end_date.toDateString()}.`,
                [{ filename: `Certificate_${membershipId}.pdf`, path: filePath }]
            );
        }).catch(err => console.error("Email/PDF Error:", err));

        res.status(200).json({ 
            status: "true",
            success: true, 
            message: "api.member_ship_verify_payment_success", // Match Constants.memberShipVerifyPaymentSuccessMsg
            data: newCard 
        });

    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 3. Fetch Active Plans for Buying
 * Triggered by: MembershipCardResponse in Flutter
 */
exports.getActiveMemberships = async (req, res) => {
    try {
        const plans = await Membership.find({ status: 1 }).sort({ price: 1 });

        // 🎯 MUST wrap in the 'data.data' pagination envelope for Flutter's Bloc
        return res.status(200).json({
            status: "true",
            success: true,
            message: "api.member_ship_card_success", // Match Constants.memberShipCardSuccessMsg
            data: {
                current_page: 1,
                data: plans.map(plan => ({
                    id: plan._id,
                    membership_card_id: plan.sql_id || 0,
                    membership_card_name: plan.name,
                    membership_card_description: plan.description,
                    membership_card_price: String(plan.price),
                    membership_card_visits: plan.visits,
                    membership_card_duration: plan.duration,
                    membership_card_duration_type: plan.duration_type
                })),
                next_page_url: null,
                prev_page_url: null,
                total: plans.length
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 4. Fetch My Membership Card details (SAM's ACTIVE CARD)
 * Required by userRoutes.js line 70
 */
exports.getMyMembershipCard = async (req, res) => {
    try {
        // Fetch all active membership plans available for purchase
        const cards = await Membership.find({ status: 1 }).lean();

        /**
         * 🎯 Matches MemberShip class in member_ship_card.dart
         * Note: price must be a String, visits/duration must be Int
         */
        const formattedCards = cards.map(card => ({
            id: card.sql_id || 0,
            name: card.name || "",
            description: card.description || "",
            visits: card.visits || 0,
            price: String(card.price || "0"),
            duration: card.duration || 1,
            duration_type: card.duration_type || 1, // 1=Month, 2=Year
            status: card.status || 1
        }));

        res.status(200).json({
            status: "true",
            message: "Membership list fetched",
            data: {
                data: formattedCards, // List inside data.data
                total_count: formattedCards.length,
                is_next: false,
                is_prev: false,
                current_page: 1,
                last_page: 1,
                links: []
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};