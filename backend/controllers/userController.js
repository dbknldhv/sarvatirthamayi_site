const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE === 'true' || process.env.MAIL_PORT == 465,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

/**
 * 1. SIGNUP
 */
exports.signupUser = async (req, res) => {
    try {
        const { first_name, last_name, email, mobile_number, password } = req.body;
        if (!first_name || !mobile_number || !email || !password) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const cleanMobile = mobile_number.trim();
        const cleanEmail = email.toLowerCase().trim();

        let user = await User.findOne({ $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }] });
        if (user && user.is_verified) return res.status(400).json({ success: false, message: "Already registered." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            user.otp = otp;
            user.otp_expires = expiry;
        } else {
            user = new User({ first_name, last_name, email: cleanEmail, mobile_number: cleanMobile, password, otp, otp_expires: expiry });
        }

        await user.save();

        try {
            await transporter.sendMail({ 
                from: process.env.MAIL_FROM, 
                to: cleanEmail, 
                subject: "Verify Account", 
                html: `<h1>Your OTP is: ${otp}</h1>` 
            });
        } catch (mailErr) {
            console.log(`👉 DEBUG OTP: ${otp}`);
        }

        res.status(200).json({ success: true, message: "OTP Sent" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * 2. VERIFY OTP
 */
exports.verifyOtp = async (req, res) => {
    try {
        const { mobile_number, otp } = req.body;
        const user = await User.findOne({ mobile_number: mobile_number?.trim() });
        
        if (!user || user.otp !== otp || user.otp_expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.is_verified = true;
        user.otp = undefined;
        await user.save();
        res.status(200).json({ success: true, message: "Verified" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * 3. LOGIN
 */
exports.loginUser = async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const user = await User.findOne({ mobile_number: mobile?.trim() });
        if (!user || !(await user.matchPassword(password))) return res.status(401).json({ success: false, message: "Invalid Credentials" });
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, first_name: user.first_name } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * 4. GET PROFILE (Fixed syntax and aliased for Line 8)
 */
/**
 * 4. GET PROFILE (Universal for Admin 1, Temple Admin 2, User 3)
 */
/**
 * 4. GET PROFILE - Final Universal Version
 * Matches Flutter Constants, BLoC Logic, and React Admin Needs
 */
exports.getProfile = async (req, res) => {
    try {
        // Fetch user based on ID from Auth Middleware
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ 
                status: "false", 
                success: false, 
                message: "User not found" 
            });
        }

        // --- 🎯 THE "FLUTTER CONTRACT" SYNC ---
        return res.status(200).json({
            status: "true",  // ✅ Required as String for Flutter
            success: true,   // ✅ Required as Boolean for React/Web
            // 🛑 CRITICAL: This MUST match Constants.profileSuccessMsg in strings.dart exactly
            message: "Profile retrieved successfully.", 
            data: {
                // 1. ID MIRRORING (Fixes "String is not a subtype of int")
                user_id: user.sql_id || parseInt(user._id.toString().substring(0, 8), 16),
                userId: user.sql_id || parseInt(user._id.toString().substring(0, 8), 16),
                id: user._id.toString(), // For MongoDB standard use

                // 2. TYPE MIRRORING (Fixes "int is not a subtype of String")
                user_type: String(user.user_type || "3"),
                userType: String(user.user_type || "3"),

                // 3. PERSONAL DETAILS (Matches my_profile_screen.dart containers)
                first_name: user.first_name || "",
                firstName: user.first_name || "",
                last_name: user.last_name || "",
                lastName: user.last_name || "",
                name: user.name || `${user.first_name} ${user.last_name || ''}`.trim(),
                email: user.email || "",
                mobile_number: user.mobile_number || "",
                mobileNumber: user.mobile_number || "",
                
                // 4. MEDIA & META
                profile_picture: user.profile_picture || "",
                profilePicture: user.profile_picture || "",
                date_of_birth: user.date_of_birth || "",
                dateOfBirth: user.date_of_birth || "",
                gender: String(user.gender || "1"),
                
                // Dynamic Role Assignment
                role: user.role || (user.user_type === 1 ? "admin" : user.user_type === 2 ? "temple_admin" : "user"),
                is_verified: user.is_verified || false
            }
        });
    } catch (error) {
        console.error("🔥 Profile API Error:", error);
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 5. ADMIN MANAGEMENT
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ created_at: -1 });
        res.status(200).json({ success: true, users });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        res.status(200).json({ success: true, user });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateUser = async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
        res.status(200).json({ success: true, data: updated });
    } catch (error) { res.status(400).json({ success: false, message: "Update failed" }); }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Deleted" });
    } catch (error) { res.status(500).json({ success: false, message: "Delete failed" }); }
};

// --- FINAL EXPORTS WITH ALIASES TO STOP THE CRASH ---
module.exports = {
    signupUser: exports.signupUser,
    signUp: exports.signupUser,     // Alias
    verifyOtp: exports.verifyOtp,
    verifyOTP: exports.verifyOtp,   // Alias
    loginUser: exports.loginUser,
    login: exports.loginUser,       // Alias
    getProfile: exports.getProfile, // 🎯 Standard
    checkAuth: exports.getProfile,  // 🎯 Common Line 8 Alias
    getMe: exports.getProfile,      // 🎯 Common Line 8 Alias
    getAllUsers: exports.getAllUsers,
    getUserById: exports.getUserById,
    updateUser: exports.updateUser,
    deleteUser: exports.deleteUser
};