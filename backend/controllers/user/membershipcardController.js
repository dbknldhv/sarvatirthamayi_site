const PurchasedMemberCard = require('../../models/PurchasedMemberCard');
const User = require('../../models/User');
const Membership = require('../../models/Membership');
const Temple = require('../../models/Temple');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
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
 */
exports.createMembershipOrder = async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.status(400).json({ success: false, message: "Membership plan ID is required" });

        const rzp = getRazorpayInstance();
        if (!rzp) return res.status(500).json({ success: false, message: "Payment Gateway Config Missing" });

        const plan = await Membership.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: "Selected plan not found" });

        const options = {
            amount: Math.round(plan.price * 100), // paise
            currency: "INR",
            receipt: `mem_order_${Date.now()}`,
        };

        const order = await rzp.orders.create(options);
        res.status(200).json({ 
            success: true, 
            data: order, 
            plan_id: plan._id,
            recalculatedPrice: plan.price 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Order creation failed", error: error.message });
    }
};

/**
 * 2. Verify Payment & Activate Membership
 * Includes logic to update User status for platform-wide discounts.
 */
exports.verifyAndActivateMembership = async (req, res) => {
    try {
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature, 
            plan_id,
            birthday, 
            importantDate, 
            favoriteTemples 
        } = req.body;

        // Validation: Ensure all Razorpay fields and Plan ID exist
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !plan_id) {
            return res.status(400).json({ success: false, message: "Missing required payment verification details" });
        }

        // 1. Signature Verification
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const generated_signature = crypto
            .createHmac("sha256", key_secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Transaction verification failed: Invalid Signature" });
        }

        const plan = await Membership.findById(plan_id);
        if (!plan) return res.status(404).json({ success: false, message: "Membership plan not found" });

        // 2. Calculate Membership Expiry
        const start_date = new Date();
        const end_date = new Date();
        if (plan.duration_type === 2) { // 2 = Years (Legacy SQL mapping)
            end_date.setFullYear(start_date.getFullYear() + plan.duration);
        } else { // 1 = Months
            end_date.setMonth(start_date.getMonth() + plan.duration);
        }

        // 3. Create Purchased Card Record
        const newCard = await PurchasedMemberCard.create({
            user_id: req.user.id,
            membership_card_id: plan._id,
            card_status: 1, // 1: Active
            start_date,
            end_date,
            max_visits: plan.visits,
            payment_status: 2, // 2: Paid
            razorpay_order_id,
            razorpay_payment_id,
            payment_date: new Date(),
            membership_card_amount: plan.price,
            paid_amount: plan.price,
            birthday: birthday ? new Date(birthday) : null,
            important_date: importantDate ? new Date(importantDate) : null,
            favorite_temples: favoriteTemples || [],
            sql_id: Math.floor(100000 + Math.random() * 900000)
        });

        // 4. SYNC USER DISCOUNTS: Update User to "active" status
        // This ensures calculatePrice in Temple/Ritual controllers sees the user as a member
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                is_member: true, 
                status: 1, 
                membership: "active" 
            }, 
            { new: true }
        );

        // 5. Generate Branded Certificate & Send Email
        try {
            // Using the path resolution from our pdfGenerator update
            const { fileName, filePath } = await generateMembershipCertificate(newCard, updatedUser);
            
            const membershipId = `STM-${newCard._id.toString().slice(-12).toUpperCase()}`;
            const emailBody = `
                <div style="font-family: sans-serif; padding: 30px; border: 2px solid #fbbf24; border-radius: 20px; max-width: 600px;">
                    <h2 style="color: #0f172a; border-bottom: 1px solid #fbbf24; padding-bottom: 10px;">Namaste ${updatedUser.name},</h2>
                    <p>Congratulations! You are now a <strong>Sovereign Member</strong> of the Sarvatirthamayi Club.</p>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #fbbf24;">
                        <p style="margin: 5px 0;"><b>Membership ID:</b> ${membershipId}</p>
                        <p style="margin: 5px 0;"><b>Valid Until:</b> ${end_date.toDateString()}</p>
                    </div>

                    <p>Your official digital certificate is attached to this email. You can also view your card on your profile.</p>
                    <p style="margin-top: 25px; color: #7c3aed; font-weight: bold;">
                        Your 0.7% Membership Discount is now automatically applied to all Ritual and Temple assistance bookings!
                    </p>
                </div>
            `;

            await mailSender(
                updatedUser.email,
                "Sovereign Membership Certificate - Sarvatirthamayi",
                emailBody,
                [{ filename: `Membership_Certificate_${membershipId}.pdf`, path: filePath }]
            );
        } catch (mailError) {
            console.error("Certificate Generation/Mail Error:", mailError.message);
            // We don't fail the request here because the DB purchase was successful
        }

        res.status(200).json({ 
            success: true, 
            message: "Membership successfully activated", 
            data: newCard 
        });

    } catch (error) {
        console.error("Membership Verification Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 3. Fetch My Membership Card details
 */
exports.getMyMembershipCard = async (req, res) => {
    try {
        const card = await PurchasedMemberCard.findOne({ 
            user_id: req.user.id, 
            payment_status: 2 
        }).sort({ created_at: -1 });

        if (!card) {
            return res.status(404).json({ success: false, message: "No active membership found for this account" });
        }

        // Fetch details of favorite temples stored on the card
        const templeDetails = await Temple.find({
            name: { $in: card.favorite_temples }
        }).select('name image location city_name');

        res.status(200).json({ 
            success: true, 
            data: { ...card._doc, templeDetails } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};