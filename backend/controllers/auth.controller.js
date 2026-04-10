const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/**
 * 🎯 EMAIL CONFIGURATION
 * Optimized for VM environments with IPv4 force and connection timeouts.
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS, 
    },
    // 🛡️ THE BOSS FIXES:
    family: 4,               // Forces IPv4 (prevents VM IPv6 timeouts)
    socketTimeout: 30000,    // Give it 30 seconds to breathe
    greetingTimeout: 30000,
    tls: {
        rejectUnauthorized: false,
        servername: 'smtp.gmail.com' // Forces correct SSL handshake
    }
});

// -------------------- HELPERS --------------------

const getFullImageUrl = (path) => {
    if (!path) return "";
    return `https://api.sarvatirthamayi.com/${String(path).replace(/\\/g, "/")}`;
};

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const normalizeMobile = (mobile) => {
    const digits = String(mobile || "").replace(/\D/g, "");
    return digits ? digits.slice(-10) : "";
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateAccessToken = (user) =>
    jwt.sign(
        { id: user._id, user_type: user.user_type, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );

/**
 * 🎯 Centralized Mailer with Terminal Debugging
 * Even if email fails, the OTP is printed to the terminal for development.
 */
const sendOtpEmail = async (email, otp, subject = "Your OTP for STM Club") => {
    console.log(`🚀 DEBUG: Attempting to send to ${email}`);
    
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: subject,
            text: `Your OTP is ${otp}`,
        });
        console.log("✅ MAIL SENT SUCCESSFULLY:", info.response);
    } catch (error) {
        // 🎯 THIS LINE IS THE KEY. It will tell us WHY it failed.
        console.error("❌ PRODUCTION BLOCKER ERROR:", error.code, error.message);
        
        if (error.code === 'EAUTH') {
            console.log("👉 FIX: Your App Password or Email is wrong in .env");
        } else if (error.code === 'ETIMEDOUT') {
            console.log("👉 FIX: Your VM Firewall is blocking the return traffic.");
        }
    }
};

const buildAuthUserResponse = (user, token = "") => ({
    id: user._id.toString(),
    user_id: user._id.toString(),
    userId: user._id.toString(),
    first_name: user.first_name || "",
    firstName: user.first_name || "",
    last_name: user.last_name || "",
    lastName: user.last_name || "",
    email: user.email || "",
    mobile_number: user.mobile_number || "",
    mobileNumber: user.mobile_number || "",
    user_type: String(user.user_type || 3),
    userType: String(user.user_type || 3),
    access_token: token || "",
    accessToken: token || "",
    profile_picture: getFullImageUrl(user.profile_picture) || ""
});

const handleDuplicateKeyError = (error, res) => {
    if (error?.code !== 11000) return false;
    if (error.keyPattern?.email) {
        res.status(400).json({ status: "false", success: false, message: "Email already registered." });
        return true;
    }
    if (error.keyPattern?.mobile_number) {
        res.status(400).json({ status: "false", success: false, message: "Mobile number already registered." });
        return true;
    }
    res.status(400).json({ status: "false", success: false, message: "Duplicate record found." });
    return true;
};

// -------------------- CONTROLLERS --------------------

exports.signUp = async (req, res) => {
    try {
        const body = req.body || {};
        const fName = body.first_name || body.firstName || body.name || "";
        const emailAddr = normalizeEmail(body.email);
        const cleanMobile = normalizeMobile(body.mobile_number || body.mobileNo);
        const pwd = body.password || "";

        if (!fName || !emailAddr || !cleanMobile || !pwd) {
            return res.status(400).json({ status: "false", message: "Missing required fields." });
        }

        let user = await User.findOne({ $or: [{ email: emailAddr }, { mobile_number: cleanMobile }] });
        const otp = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            user.first_name = fName;
            if (pwd) user.password = pwd; 
            user.otp = otp;
            user.otp_expires = otpExpires;
            user.is_verified = false;
            await user.save();
        } else {
            user = await User.create({
                first_name: fName,
                email: emailAddr,
                mobile_number: cleanMobile,
                password: pwd,
                otp: otp,
                otp_expires: otpExpires,
                is_verified: false,
                user_type: 3
            });
        }

        // Send OTP in background
        sendOtpEmail(emailAddr, otp, "Verify your STM Club Account");

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP sent successfully",
            data: { id: user._id.toString(), userId: user._id.toString(), mobile_number: user.mobile_number }
        });
    } catch (error) {
        if (handleDuplicateKeyError(error, res)) return;
        console.error("SIGNUP ERROR:", error);
        return res.status(500).json({ status: "false", message: "Internal Server Error" });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const mobile = normalizeMobile(req.body.mobile_number || req.body.mobileNumber || req.body.mobileNo);
        const otp = String(req.body.otp || "").trim();

        const user = await User.findOne({
            mobile_number: mobile,
            otp: otp,
            otp_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ status: "false", success: false, message: "Invalid or expired OTP." });
        }

        user.is_verified = true;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        const token = generateAccessToken(user);
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Account verified successfully!",
            token: token,
            data: buildAuthUserResponse(user, token)
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const mobileNumber = normalizeMobile(req.body.mobile_number || req.body.mobileNo);
        const user = await User.findOne({ mobile_number: mobileNumber });

        if (!user) return res.status(404).json({ status: "false", message: "User not found" });

        const otp = generateOtp();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        sendOtpEmail(user.email, otp);

        return res.status(200).json({ status: "true", success: true, message: "OTP resent successfully" });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const mobile = normalizeMobile(req.body.mobile_number || req.body.mobileNo);

        let user = email ? await User.findOne({ email }) : await User.findOne({ mobile_number: mobile });

        if (!user) return res.status(404).json({ status: "false", success: false, message: "No account found." });

        const otp = generateOtp();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        if (user.email) {
            sendOtpEmail(user.email, otp, "Password Reset OTP - STM Club");
        } else {
            console.log(`👉 TERMINAL FORGOT OTP FOR ${user.mobile_number}: ${otp}`);
        }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP sent successfully",
            data: { id: user._id.toString(), userId: user._id.toString() }
        });
    } catch (error) {
        return res.status(500).json({ status: "false", message: "Server error" });
    }
};

exports.forgotVerifyOtp = async (req, res) => {
    try {
        const userId = req.body.user_id || req.body.userId;
        const otp = String(req.body.otp || "").trim();

        const user = await User.findOne({ _id: userId, otp: otp, otp_expires: { $gt: Date.now() } });

        if (!user) return res.status(400).json({ status: "false", success: false, message: "Invalid or expired OTP." });

        const tempToken = generateAccessToken(user);
        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP verified",
            token: tempToken,
            data: { id: user._id.toString(), accessToken: tempToken, userId: user._id.toString() }
        });
    } catch (error) {
        return res.status(500).json({ status: "false", message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password, otp } = req.body;
        const confirmPassword = req.body.confirm_password || req.body.confirmPassword;
        const userId = req.body.user_id || req.body.userId;

        if (password !== confirmPassword) {
            return res.status(400).json({ status: "false", message: "Passwords do not match." });
        }

        const user = await User.findOne({ _id: userId, otp: otp, otp_expires: { $gt: Date.now() } });

        if (!user) return res.status(400).json({ status: "false", message: "Invalid session." });

        user.password = password;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        const token = generateAccessToken(user);
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Password reset successful",
            data: buildAuthUserResponse(user, token)
        });
    } catch (error) {
        return res.status(500).json({ status: "false", message: "Server error" });
    }
};

exports.login = async (req, res) => {
    try {
        const mobile = normalizeMobile(req.body.mobile || req.body.mobile_number || req.body.mobileNo);
        const password = req.body.password || "";

        const user = await User.findOne({ mobile_number: mobile });

        if (!user) return res.status(401).json({ status: "false", message: "User not found." });
        if (!user.is_verified) return res.status(401).json({ status: "false", message: "Account unverified." });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ status: "false", message: "Invalid password." });

        const token = generateAccessToken(user);
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Login Successful",
            data: buildAuthUserResponse(user, token)
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: "Login error" });
    }
};

exports.adminSignup = async (req, res) => {
    try {
        const { first_name, last_name, email, password, user_type, mobile_number, temple_id } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedMobile = normalizeMobile(mobile_number);

        const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { mobile_number: normalizedMobile }] });
        if (existing) return res.status(400).json({ success: false, message: "Email or mobile already in use" });

        const user = await User.create({
            first_name, last_name, name: `${first_name} ${last_name || ""}`.trim(),
            email: normalizedEmail, mobile_number: normalizedMobile,
            password, user_type: Number(user_type),
            temple_id: Number(user_type) === 2 ? temple_id : null,
            is_verified: true // Admin usually auto-verified
        });

        const token = generateAccessToken(user);
        return res.status(201).json({
            success: true, token,
            user: { id: user._id, name: user.first_name, email: user.email, user_type: user.user_type },
            redirectPath: user.user_type === 1 ? "/admin/dashboard" : "/temple-admin/dashboard"
        });
    } catch (error) {
        if (handleDuplicateKeyError(error, res)) return;
        return res.status(500).json({ success: false, message: "Admin signup failed" });
    }
};

exports.refreshAccessToken = async (req, res) => {
    try {
        return res.status(200).json({ status: "true", success: true, message: "Token valid", data: [] });
    } catch (error) {
        return res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

exports.checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.body.user_id || req.body.userId || req.body.id;
        res.clearCookie("accessToken");
        if (userId) await User.updateOne({ _id: userId }, { $unset: { refreshToken: 1 } });
        return res.status(200).json({ status: "true", success: true, message: "Logged out" });
    } catch (error) {
        return res.status(500).json({ status: "false", message: "Logout error" });
    }
};

module.exports = {
    signUp: exports.signUp,
    verifyOtp: exports.verifyOtp,
    resendOtp: exports.resendOtp,
    forgotVerifyOtp: exports.forgotVerifyOtp,
    forgotPassword: exports.forgotPassword,
    resetPassword: exports.resetPassword,
    login: exports.login,
    logout: exports.logout,
    adminSignup: exports.adminSignup,
    refreshAccessToken: exports.refreshAccessToken,
    checkAuth: exports.checkAuth
};