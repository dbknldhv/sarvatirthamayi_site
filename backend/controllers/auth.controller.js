const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// OTP Store (Using a Map)
const otpStore = new Map();

// Email Configuration
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    service: 'gmail',
    secure: process.env.MAIL_SECURE === 'true' || process.env.MAIL_PORT == 465,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    tls: { rejectUnauthorized: false }
});

// Helper to format Image URLs for Flutter
const getFullImageUrl = (path) => {
    if (!path) return "";
    return `https://api.sarvatirthamayi.com/${path.replace(/\\/g, '/')}`;
};

/**
 * 1. SIGN UP - Supports Flutter (mobile_number) and React (mobileNumber)
 */
exports.signUp = async (req, res) => {
    const mobileNumber =
        req.body.mobile_number ||
        req.body.mobileNumber ||
        req.body.mobileNo;

    const firstName =
        req.body.first_name ||
        req.body.firstName ||
        req.body.name;

    const email =
    req.body.email ||
    req.body.user_email ||
    "";
    const lastName =
        req.body.last_name ||
        req.body.lastName ||
        "";

    const password = req.body.password;
    const confirmPassword =
        req.body.confirm_password ||
        req.body.confirmPassword ||
        req.body.cpassword;

    try {
        if (!mobileNumber || !firstName || !password || !email) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Required fields are missing."
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Password and confirm password do not match."
            });
        }

        const sanitizedMobile = mobileNumber.replace(/\D/g, '').slice(-10);

        const existingUser = await User.findOne({ mobile_number: sanitizedMobile });
        if (existingUser) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Mobile number already registered."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(sanitizedMobile, {
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            password,
            otp,
            expires: Date.now() + 600000
        });

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: email.toLowerCase().trim(),  // user email
                subject: "Your OTP for STM Club",
                text: `Your OTP is ${otp}`,
            });
        } catch (mailErr) {
            console.log(`👉 DEBUG OTP for ${sanitizedMobile}: ${otp}`);
        }

        return res.status(200).json({
            status: "true",              // Flutter
            success: true,               // React
            message: "OTP sent successfully",
            data: {
                id: sanitizedMobile,
                user_id: sanitizedMobile,
                userId: sanitizedMobile,
                first_name: firstName,
                firstName: firstName,
                mobile_number: sanitizedMobile,
                mobileNumber: sanitizedMobile
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};

/**
 * 2. VERIFY OTP & CREATE USER
 */
exports.verifyOtp = async (req, res) => {
    const mobileNumberRaw =
        req.body.mobile_number ||
        req.body.mobileNumber ||
        req.body.mobileNo;

    const { otp } = req.body;

    const mobileNumber = mobileNumberRaw
        ? mobileNumberRaw.replace(/\D/g, '').slice(-10)
        : "";

    const data = otpStore.get(mobileNumber);

    try {
        if (data && data.otp === otp && data.expires > Date.now()) {
            const user = await User.create({
                first_name: data.firstName,
                last_name: data.lastName,
                name: `${data.firstName} ${data.lastName || ""}`.trim(),
                email: data.email,
                mobile_number: mobileNumber,
                password: data.password,
                user_type: 3,
                is_verified: true,
            });

            otpStore.delete(mobileNumber);

            return res.status(201).json({
                status: "true",
                success: true,
                message: "Account created successfully!",
                data: {
                    id: user._id.toString(),
                    user_id: user._id.toString(),
                    userId: user._id.toString(),
                    first_name: user.first_name,
                    firstName: user.first_name,
                    mobile_number: user.mobile_number,
                    mobileNumber: user.mobile_number
                }
            });
        } else {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Invalid or expired OTP"
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};

exports.resendOtp = async (req, res) => {
    const mobileNumberRaw =
        req.body.mobile_number ||
        req.body.mobileNumber ||
        req.body.mobileNo;

    const mobileNumber = mobileNumberRaw
        ? mobileNumberRaw.replace(/\D/g, '').slice(-10)
        : "";

    try {
        const existingOtpData = otpStore.get(mobileNumber);

        if (!mobileNumber || !existingOtpData) {
            return res.status(404).json({
                status: "false",
                success: false,
                message: "User not found or signup session expired."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(mobileNumber, {
            ...existingOtpData,
            otp,
            expires: Date.now() + 600000
        });

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: existingOtpData.email,
                subject: "Your OTP for STM Club",
                text: `Your OTP is ${otp}`,
            });
        } catch (mailErr) {
            console.log(`👉 DEBUG RESEND OTP for ${mobileNumber}: ${otp}`);
        }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP resent successfully"
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};
/** forgotverify otp */
exports.forgotVerifyOtp = async (req, res) => {
    try {
        const userId = req.body.user_id || req.body.userId;
        const otp = String(req.body.otp || "");

        if (!userId || !otp) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "User id and OTP are required."
            });
        }

        const user = await User.findOne({
            _id: userId,
            otp: otp,
            otp_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Invalid or expired OTP."
            });
        }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP verified successfully",
            data: {
                id: user._id.toString(),
                user_id: user._id.toString(),
                userId: user._id.toString(),
                first_name: user.first_name || "",
                firstName: user.first_name || ""
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};

/**
 * 3. ADMIN & TEMPLE ADMIN SIGNUP (React Admin Only)
 */
exports.adminSignup = async (req, res) => {
    try {
        const { first_name, last_name, email, password, user_type, temple_id, mobile_number } = req.body;

        if (!first_name || !email || !password || !user_type || !mobile_number) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const userExists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { mobile_number }] });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Email or Mobile already in use" });
        }

        const user = await User.create({
            first_name,
            last_name,
            name: `${first_name} ${last_name || ""}`.trim(),
            email: email.toLowerCase(),
            mobile_number,
            password, 
            user_type: Number(user_type), 
            temple_id: user_type == 2 ? temple_id : null,
        });

        const token = jwt.sign(
            { id: user._id, user_type: user.user_type, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.first_name, email: user.email, user_type: user.user_type },
            redirectPath: user.user_type === 1 ? "/admin/dashboard" : "/temple-admin/dashboard"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 4. UNIFIED LOGIN (React & Flutter)
 */
/**
 * UNIFIED LOGIN - Supports React (mobileNumber) & Flutter (mobile_number)
 * Handles country code stripping (+91) for Flutter requests
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Extract raw mobile from either Flutter or React key
        let rawMobile = req.body.mobile_number || req.body.mobileNumber;
        let user;

        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else if (rawMobile) {
            // 2. SANITIZE: Remove '+91' or any non-digits and keep the last 10 digits
            // This ensures +919182635762 becomes 9182635762 to match your DB
            const sanitizedMobile = rawMobile.replace(/\D/g, '').slice(-10);
            
            user = await User.findOne({ mobile_number: sanitizedMobile });
        }

        // 3. VALIDATION
        if (!user) {
            return res.status(401).json({ 
                status: "false", 
                success: false, 
                message: "Invalid credentials (User not found)." 
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                status: "false", 
                success: false, 
                message: "Invalid credentials (Password mismatch)." 
            });
        }

        // 4. TOKEN GENERATION
        const token = jwt.sign(
            { id: user._id, user_type: user.user_type, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const paths = { 1: "/admin/dashboard", 2: "/temple-admin/dashboard", 3: "/" };

        // 5. RESPONSE (Unified for Flutter Models & React Admin)
        res.status(200).json({
            status: "true",           // Required by Flutter LoginModel
            success: true,            // Required by React Admin
            message: "Login Successful",
            token: token,             // React legacy key
            redirectPath: paths[user.user_type] || "/",
            data: {                   // Flutter Data Object
                user_id: user._id.toString(),   // 🔥 FIXED (IMPORTANT)
                userId: user._id.toString(),
                first_name: user.first_name || "",
                firstName: user.first_name || "",
                last_name: user.last_name || "",
                access_token: token,            // 🔥 MUST MATCH Flutter
                email: user.email || "",
                date_of_birth: user.date_of_birth || "",
                gender: user.gender ? String(user.gender) : "",
                user_type: String(user.user_type || 3),
                profile_picture: getFullImageUrl(user.profile_picture) || ""

            },
            // Legacy user object for React
            user: { 
                id: user._id, 
                email: user.email, 
                name: user.first_name || user.first_name, 
                user_type: user.user_type, 
                role: user.role 
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ status: "false", success: false, message: "Server error" });
    }
};

/**
 * 5. REFRESH ACCESS TOKEN
 */
exports.refreshAccessToken = async (req, res) => {
    try {
        // Typically, checkAuth middleware already validates the token.
        // We return a simple success if the user reached this point.
        res.status(200).json({ 
            status: "true", 
            success: true, 
            message: "Token is valid",
            data: [] 
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 6. CHECK AUTH (Used by React Frontend)
 */
exports.checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

/**
 * 7. FORGOT PASSWORD
 */
exports.forgotPassword = async (req, res) => {
    try {
        const email = (req.body.email || "").toLowerCase().trim();
        const mobileNumberRaw = req.body.mobile_number || req.body.mobileNumber;
        const mobileNumber = mobileNumberRaw
            ? mobileNumberRaw.replace(/\D/g, '').slice(-10)
            : "";

        const user = await User.findOne({ mobile_number: mobileNumber });

        if (!user) {
            return res.status(404).json({
                status: "false",
                success: false,
                message: "No account found."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP sent successfully",
            data: {
                id: user._id.toString(),
                user_id: user._id.toString(),
                userId: user._id.toString(),
                first_name: user.first_name,
                firstName: user.first_name,
                mobile_number: user.mobile_number,
                mobileNumber: user.mobile_number
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};
/**
 * 8. RESET PASSWORD
 */
exports.resetPassword = async (req, res) => {
    try {
        const otp = String(req.body.otp || "");
        const password = req.body.password;
        const confirmPassword =
            req.body.confirm_password ||
            req.body.confirmPassword ||
            password;

        const userId = req.body.user_id || req.body.userId;
        const email = (req.body.email || "").toLowerCase().trim();
        const mobileNumberRaw = req.body.mobile_number || req.body.mobileNumber || "";
        const mobileNumber = mobileNumberRaw
            ? mobileNumberRaw.replace(/\D/g, '').slice(-10)
            : "";

        if ((!userId && !email && !mobileNumber) || !otp || !password) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "User id, email, or mobile number along with OTP and password is required."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Password and confirm password do not match."
            });
        }

        let query = {
            otp: otp,
            otp_expires: { $gt: Date.now() }
        };

        if (userId) {
            query._id = userId;
        } else if (email) {
            query.email = email;
        } else if (mobileNumber) {
            query.mobile_number = mobileNumber;
        }

        const user = await User.findOne(query);

        if (!user) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Invalid or expired OTP."
            });
        }

        user.password = password;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        const token = jwt.sign(
            { id: user._id, user_type: user.user_type, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            status: "true",
            success: true,
            message: "Password updated successfully!",
            data: {
                id: user._id.toString(),
                user_id: user._id.toString(),
                userId: user._id.toString(),
                first_name: user.first_name || "",
                firstName: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                mobile_number: user.mobile_number || "",
                mobileNumber: user.mobile_number || "",
                user_type: String(user.user_type || 3),
                access_token: token,
                profile_picture: getFullImageUrl(user.profile_picture) || ""
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.body.user_id || req.body.userId || req.body.all_devices || null;

        // Clear cookies for React if they exist
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        // Optional future support if you store refresh tokens / sessions in DB
        if (userId) {
            await User.updateOne(
                { $or: [{ _id: userId }, { sql_id: userId }] },
                {
                    $unset: {
                        refreshToken: 1,
                        deviceToken: 1
                    }
                }
            ).catch(() => {});
        }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "Logged out successfully",
            data: []
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};

// --- SYNCED EXPORTS ---
module.exports = {
    signUp: exports.signUp,
    verifyOtp: exports.verifyOtp,
    resendOtp: exports.resendOtp,
    forgotVerifyOtp: exports.forgotVerifyOtp,
    adminSignup: exports.adminSignup,
    login: exports.login,
    checkAuth: exports.checkAuth,
    refreshAccessToken: exports.refreshAccessToken,
    forgotPassword: exports.forgotPassword,
    resetPassword: exports.resetPassword,
    logout: exports.logout
};