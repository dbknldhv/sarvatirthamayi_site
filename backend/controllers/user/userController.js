const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../../config/db");

// --- EMAIL CONFIGURATION ---
// --- UPDATED EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 465, // Gmail SSL port
    secure: true, // Must be true for 465
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS // 16-character App Password
    },
    // This helps bypass local network restrictions
    tls: {
        rejectUnauthorized: false 
    }
});
// --- STEP 1: SIGNUP & SEND OTP ---
exports.signupUser = async (req, res) => {
    try {
        const { first_name, last_name, email, mobile_number, password } = req.body;

        // Defensive checks to prevent .trim() errors if fields are missing in Postman
        if (!first_name || !mobile_number || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "First name, mobile, email, and password are required." 
            });
        }

        const cleanMobile = mobile_number.trim();
        const cleanEmail = email.toLowerCase().trim();

        let user = await User.findOne({ 
            $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }] 
        });
        
        if (user && user.is_verified) {
            return res.status(400).json({ 
                success: false, 
                message: "This mobile or email is already registered and verified." 
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            user.first_name = first_name;
            user.last_name = last_name || "";
            user.email = cleanEmail;
            user.password = password; 
            user.otp = otp;
            user.otp_expires = otpExpires;
        } else {
            user = new User({
                first_name,
                last_name: last_name || "",
                email: cleanEmail,
                mobile_number: cleanMobile,
                password,
                user_type: 3, // Default to User
                is_verified: false,
                otp,
                otp_expires: otpExpires
            });
        }

        await user.save();
        
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: cleanEmail,
            subject: "Verify Your Account - STM Club",
            html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
                    <h2 style="color:#7c3aed;">Verification Code</h2>
                    <p>Welcome to STM Club. Use the code below to verify your account:</p>
                    <h1 style="background:#f3f4f6; padding:10px; text-align:center; letter-spacing:5px;">${otp}</h1>
                    <p style="color:#666;">This code is valid for 10 minutes.</p>
                   </div>`
        });

        res.status(200).json({ success: true, message: "Code sent to your email." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- STEP 2: RESEND OTP ---
exports.resendOtp = async (req, res) => {
    try {
        const { mobile_number } = req.body;
        if (!mobile_number) return res.status(400).json({ success: false, message: "Mobile number is required." });

        const user = await User.findOne({ mobile_number: mobile_number.trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = newOtp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: user.email,
            subject: "New Verification Code - STM Club",
            html: `<h1>${newOtp}</h1><p>Your new code is valid for 10 minutes.</p>`
        });

        res.status(200).json({ success: true, message: "New code sent to your email." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- STEP 3: VERIFY OTP ---
exports.verifyOtp = async (req, res) => {
    try {
        const { mobile_number, otp } = req.body;
        if (!mobile_number || !otp) return res.status(400).json({ success: false, message: "Mobile and OTP are required." });

        const user = await User.findOne({ mobile_number: mobile_number.trim(), otp });

        if (!user) return res.status(400).json({ success: false, message: "Invalid verification code." });
        if (new Date() > user.otp_expires) return res.status(400).json({ success: false, message: "Code expired. Please resend." });

        user.is_verified = true;
        user.otp = null; 
        user.otp_expires = null;
        await user.save();

        res.status(200).json({ success: true, message: "Account verified successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- STEP 4: LOGIN (Updated with Redirect logic) --- 
exports.loginUser = async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const cleanMobile = mobile ? mobile.trim() : "";

        const user = await User.findOne({ mobile_number: cleanMobile });

        if (!user) return res.status(401).json({ success: false, message: "User not found. Please register." });
        if (!user.is_verified) return res.status(401).json({ success: false, message: "Account unverified." });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        // Define redirect paths based on the role assigned by Schema hooks
        let redirectPath = "/user/dashboard";
        if (user.role === 'admin') redirectPath = "/admin/dashboard";
        if (user.role === 'temple-admin') redirectPath = "/temple/dashboard";

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ 
            success: true, 
            token, 
            role: user.role,
            redirectPath,
            user: userResponse 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- STEP 5: PROFILE MANAGEMENT ---
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password"); 
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { first_name, last_name, mobile } = req.body;
        const updateData = {};
        
        if (first_name) updateData.first_name = first_name;
        if (last_name) updateData.last_name = last_name;
        if (mobile) updateData.mobile_number = mobile;

        if (req.files) {
            if (req.files['profileImage']) updateData.profile_picture = req.files['profileImage'][0].path;
            if (req.files['bannerImage']) updateData.banner_image = req.files['bannerImage'][0].path;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select("-password");
        res.status(200).json({ success: true, message: "Profile updated", user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- STEP 6: PASSWORD RECOVERY ---
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "Email not found." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: user.email,
            subject: "Password Reset Code",
            html: `<h1>${otp}</h1>`
        });
        res.status(200).json({ success: true, message: "Code sent." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim(), otp });
        if (!user || new Date() > user.otp_expires) return res.status(400).json({ success: false, message: "Invalid/Expired OTP" });

        user.password = new_password; 
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();
        res.status(200).json({ success: true, message: "Password updated!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- STEP 7: ADMIN CRUD OPS ---
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ created_at: -1 }).select("-password");
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "User Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
};

// --- STEP 8: SQL DATA FETCHING ---
exports.getAllRituals = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM rituals WHERE status = 'active' OR status = '1'");
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error: " + error.message });
    }
};

exports.getMembershipPlans = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM membership_cards WHERE status = 'active' OR status = '1'");
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error: " + error.message });
    }
};

exports.getAssistantsByTemple = async (req, res) => {
    try {
        const { templeId } = req.params;
        const [rows] = await db.execute("SELECT * FROM temple_assistants WHERE temple_id = ?", [templeId]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error: " + error.message });
    }
};

exports.bookRitual = async (req, res) => {
    try {
        res.status(200).json({ success: true, message: "Booking received!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.purchaseMembership = async (req, res) => {
    try {
        res.status(200).json({ success: true, message: "Purchase successful!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};