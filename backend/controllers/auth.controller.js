const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/**
 * 1. DYNAMIC EMAIL CONFIGURATION
 * Optimized for both local and production environments.
 */
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || 465),
    secure: parseInt(process.env.MAIL_PORT) === 465,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/**
 * HELPER: Token Generation
 * Access Token: Used for every API call (short-lived)
 * Refresh Token: Stored in HttpOnly cookie to get new Access Tokens (long-lived)
 */
const generateAccessAndRefreshTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user._id, user_type: user.user_type, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" } // 15 minutes
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_SECRET || "stm_refresh_fallback_secret",
        { expiresIn: "7d" } // 7 days
    );

    return { accessToken, refreshToken };
};

/**
 * 2. REFRESH ACCESS TOKEN
 * Triggered by frontend interceptors when Access Token expires.
 */
exports.refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: "No refresh token provided" });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        const { accessToken } = generateAccessAndRefreshTokens(user);

        res.status(200).json({
            success: true,
            token: accessToken
        });
    } catch (error) {
        res.status(403).json({ success: false, message: "Session expired. Please login again." });
    }
};

/**
 * 3. SIGN UP - INITIATE (Persistent OTP)
 */
exports.signUp = async (req, res) => {
    const { firstName, lastName, mobileNumber, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ mobile_number: mobileNumber });
        if (existingUser && existingUser.is_verified) {
            return res.status(400).json({ success: false, message: "Mobile number already registered." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expires = new Date(Date.now() + 10 * 60000); // 10 minutes

        await User.findOneAndUpdate(
            { mobile_number: mobileNumber },
            { 
                first_name: firstName, 
                last_name: lastName, 
                email: email?.toLowerCase(),
                password, 
                otp, 
                otp_expires,
                is_verified: false 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email || process.env.MAIL_USER,
            subject: "Verification Code for STM Club",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd;">
                    <h2 style="color: #7c3aed;">Welcome to STM Club</h2>
                    <p>Use the following OTP to verify your account. It is valid for 10 minutes.</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">
                        ${otp}
                    </div>
                </div>
            `
        });

        res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ success: false, message: "Server error during signup" });
    }
};

/**
 * 4. VERIFY OTP & ACTIVATE
 */
exports.verifyOtp = async (req, res) => {
    const { mobileNumber, otp } = req.body;

    try {
        const user = await User.findOne({ 
            mobile_number: mobileNumber, 
            otp, 
            otp_expires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.is_verified = true;
        user.otp = null;
        user.otp_expires = null;
        await user.save();

        const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(201).json({ 
            success: true, 
            message: "Account verified successfully!", 
            token: accessToken,
            user 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Verification failed" });
    }
};

/**
 * 5. UNIFIED LOGIN
 * Issues Access Token and sets Refresh Token in Cookie.
 */
exports.login = async (req, res) => {
    try {
        const { email, mobileNumber, password } = req.body;
        let user;

        if (email) user = await User.findOne({ email: email.toLowerCase() });
        else if (mobileNumber) user = await User.findOne({ mobile_number: mobileNumber });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        const isAdmin = user.user_type === 1 || user.user_type === 2;
        if (!isAdmin && !user.is_verified) {
            return res.status(403).json({ success: false, message: "Please verify your mobile number first." });
        }

        const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(200).json({
            success: true,
            token: accessToken,
            user,
            redirectPath: user.user_type === 1 ? "/admin/dashboard" : user.user_type === 2 ? "/temple-admin/dashboard" : "/"
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * 6. ADMIN SIGNUP (Secure Internal Flow)
 */
exports.adminSignup = async (req, res) => {
    try {
        const { first_name, last_name, email, password, user_type, temple_id, mobile_number } = req.body;

        const userExists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { mobile_number }] });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Email or Mobile already in use" });
        }

        const user = await User.create({
            first_name,
            last_name,
            email: email.toLowerCase(),
            mobile_number,
            password, 
            user_type: Number(user_type), 
            temple_id: user_type == 2 ? temple_id : null,
            is_verified: true 
        });

        const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(201).json({
            success: true,
            token: accessToken,
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * 7. LOGOUT
 */
exports.logout = (req, res) => {
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "Logged out successfully" });
};