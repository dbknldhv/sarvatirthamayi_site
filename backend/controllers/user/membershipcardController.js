const PurchasedMemberCard = require('../../models/PurchasedMemberCard');
const User = require('../../models/User');
const Membership = require('../../models/Membership');
const Temple = require('../../models/Temple');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const { generateMembershipCertificate } = require('../../utils/pdfGenerator');
const mailSender = require("../../utils/mailSender");

// Helper for Razorpay Instance
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) return null;
    return new Razorpay({ key_id, key_secret });
};

exports.createMembershipOrder = async (req, res) => {
    try {
        const rzp = getRazorpayInstance();
        const { planId } = req.body; 

        if (!rzp) return res.status(500).json({ success: false, message: "Payment Gateway Config Missing" });

        const plan = await Membership.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: "Selected plan not found" });

        const options = {
            amount: Math.round(plan.price * 100), 
            currency: "INR",
            receipt: `membership_rcpt_${Date.now()}`,
        };

        const order = await rzp.orders.create(options);
        // Include plan_id so the frontend can send it back for verification
        res.status(200).json({ success: true, data: order, plan_id: plan._id });
    } catch (error) {
        res.status(500).json({ success: false, message: "Order creation failed", error: error.message });
    }
};

exports.verifyAndActivateMembership = async (req, res) => {
    try {
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature, 
            plan_id, // Ensure frontend sends this
            birthday, 
            importantDate, 
            favoriteTemples 
        } = req.body;

        // 1. Signature Verification
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const generated_signature = crypto
            .createHmac("sha256", key_secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Transaction verification failed" });
        }

        // 2. Fetch the actual Plan details from your Membership model
        const plan = await Membership.findById(plan_id);
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

        // 3. Calculate Dates based on Model's duration and duration_type
        const start_date = new Date();
        const end_date = new Date();
        if (plan.duration_type === 2) { // Years
            end_date.setFullYear(start_date.getFullYear() + plan.duration);
        } else { // Months
            end_date.setMonth(start_date.getMonth() + plan.duration);
        }

        // 4. Save to PurchasedMemberCard
        const newCard = await PurchasedMemberCard.create({
            user_id: req.user.id,
            membership_card_id: plan._id,
            card_status: 1, 
            start_date,
            end_date,
            max_visits: plan.visits,
            payment_status: 2, 
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

        // Upgrade User
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            { is_member: true }, 
            { new: true }
        );

        // --- GENERATE PDF & SEND MAIL ---
        try {
            const { fileName, filePath } = await generateMembershipCertificate(newCard, updatedUser);
            
            const membershipId = `STM-${newCard._id.toString().slice(-12).toUpperCase()}`;
            const emailBody = `
                <div style="font-family: sans-serif; color: #333;">
                    <h2>Namaste ${updatedUser.name},</h2>
                    <p>Congratulations! Your <strong>Sovereign Membership</strong> with Sarvatirthamayi Club is now active.</p>
                    <p>Your unique Membership ID is: <strong>${membershipId}</strong></p>
                    <p>We have attached your official digital membership certificate to this email. You can also view your digital card anytime on your profile.</p>
                    <br/>
                    <p>Enjoy your exclusive 25% discount on all future ritual bookings!</p>
                </div>
            `;

            // Use your mailSender utility but with the attachment capability
            // We use a custom transporter here to ensure the attachment sends correctly
            const nodemailer = require("nodemailer");
            const transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: 465,
                secure: true,
                auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
            });

            await transporter.sendMail({
                from: `Sarvatirthamayi <${process.env.MAIL_USER}>`,
                to: updatedUser.email,
                subject: "Your Sovereign Membership Certificate - Sarvatirthamayi",
                html: emailBody,
                attachments: [
                    {
                        filename: `Membership_Certificate.pdf`,
                        path: filePath
                    }
                ]
            });
        } catch (mailError) {
            console.error("Post-activation (PDF/Mail) error:", mailError);
            // We don't return an error response here because the payment/activation WAS successful
        }

        res.status(200).json({ success: true, message: "Membership Activated & Certificate Sent", data: newCard });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 3. Get User Card (Populated) ---
exports.getMyMembershipCard = async (req, res) => {
    try {
        
        const card = await PurchasedMemberCard.findOne({ 
            user_id: req.user.id, 
            payment_status: 2 
        }).sort({ created_at: -1 });

        if (!card) return res.status(404).json({ success: false, message: "No active membership" });

        const templeDetails = await Temple.find({
            name: { $in: card.favorite_temples }
        }).select('name image location');

        res.status(200).json({ 
            success: true, 
            data: { ...card._doc, templeDetails } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 4. Mock Activation (For Testing) ---
exports.mockVerifyAndActivate = async (req, res) => {
    try {
        const { birthday, importantDate, favoriteTemples } = req.body;
        const plan = await Membership.findOne() || { _id: "65f1a2b3c4d5e6f7a8b9c0d1", price: 6599 };

        const newCard = await PurchasedMemberCard.create({
            user_id: req.user.id,
            membership_card_id: plan._id,
            card_status: 1,
            start_date: new Date(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 99)),
            payment_status: 2,
            razorpay_order_id: "mock_order_" + Date.now(),
            razorpay_payment_id: "mock_pay_" + Date.now(),
            membership_card_amount: plan.price,
            paid_amount: plan.price,
            birthday: birthday ? new Date(birthday) : null,
            important_date: importantDate ? new Date(importantDate) : null,
            favorite_temples: favoriteTemples || [],
            sql_id: Math.floor(100000 + Math.random() * 900000)
        });

        await User.findByIdAndUpdate(req.user.id, { is_member: true });
        res.status(200).json({ success: true, message: "Mock Activated", data: newCard });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};