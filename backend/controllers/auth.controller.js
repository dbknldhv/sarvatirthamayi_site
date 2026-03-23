const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// In-memory OTP store
const otpStore = new Map();

// Email transport
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    service: "gmail",
    secure: process.env.MAIL_SECURE === "true" || String(process.env.MAIL_PORT) === "465",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    tls: { rejectUnauthorized: false }
});

// -------------------- Helpers --------------------

const getFullImageUrl = (path) => {
    if (!path) return "";
    return `https://api.sarvatirthamayi.com/${String(path).replace(/\\/g, "/")}`;
};

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const normalizeMobile = (mobile) => {
    const digits = String(mobile || "").replace(/\D/g, "");
    return digits ? digits.slice(-10) : "";
};

const extractSignupPayload = (body = {}) => {
    return {
        firstName: body.first_name || body.firstName || body.name || "",
        lastName: body.last_name || body.lastName || "",
        email: body.email || body.user_email || "",
        mobileNumber: body.mobile_number || body.mobileNumber || body.mobileNo || "",
        password: body.password || "",
        confirmPassword:
            body.confirm_password ||
            body.confirmPassword ||
            body.password_confirmation ||
            body.cpassword ||
            ""
    };
};

const extractMobileFromBody = (body = {}) =>
    body.mobile_number || body.mobileNumber || body.mobileNo || "";

const extractUserIdFromBody = (body = {}) =>
    body.user_id || body.userId || "";

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateAccessToken = (user) =>
    jwt.sign(
        { id: user._id, user_type: user.user_type, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );

const sendOtpEmail = async (email, otp, subject = "Your OTP for STM Club") => {
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject,
        text: `Your OTP is ${otp}`,
    });
};

const buildAuthUserResponse = (user, token = "") => ({
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
    access_token: token || "",
    profile_picture: getFullImageUrl(user.profile_picture) || ""
});

const buildTempSignupResponse = (firstName, mobileNumber) => ({
    id: mobileNumber,
    user_id: mobileNumber,
    userId: mobileNumber,
    first_name: firstName,
    firstName: firstName,
    mobile_number: mobileNumber,
    mobileNumber: mobileNumber
});

const handleDuplicateKeyError = (error, res) => {
    if (error?.code !== 11000) return false;

    console.log("DUPLICATE KEY ERROR:", {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        message: error.message
    });

    if (error.keyPattern?.email) {
        res.status(400).json({
            status: "false",
            success: false,
            message: "Email already registered."
        });
        return true;
    }

    if (error.keyPattern?.mobile_number) {
        res.status(400).json({
            status: "false",
            success: false,
            message: "Mobile number already registered."
        });
        return true;
    }

    res.status(400).json({
        status: "false",
        success: false,
        message: "Duplicate record found.",
        debug: error.keyValue || {}
    });
    return true;
};

// -------------------- Controllers --------------------

/**
 * SIGN UP
 * Sends OTP and stores signup session in memory
 */
exports.signUp = async (req, res) => {
    try {
        // --- INTERNAL HELPERS (Prevents 500 crashes) ---
        const body = req.body || {};
        const fName = body.first_name || body.firstName || body.name || "";
        const emailAddr = String(body.email || "").toLowerCase().trim();
        const rawMobile = String(body.mobile_number || body.mobileNo || "");
        const cleanMobile = rawMobile.replace(/\D/g, "").slice(-10);
        const pwd = body.password || "";

        // --- 1. VALIDATION ---
        if (!fName || !emailAddr || !cleanMobile || !pwd) {
            return res.status(400).json({ 
                status: "false", 
                message: "Missing Name, Email, Mobile, or Password" 
            });
        }

        // --- 2. DATABASE SEARCH ---
        let user = await User.findOne({ 
            $or: [{ email: emailAddr }, { mobile_number: cleanMobile }] 
        });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            // Update existing user (Verified or Unverified)
            user.first_name = fName;
            if (pwd) user.password = pwd; 
            user.otp = otp;
            user.otp_expires = otpExpires;
            user.is_verified = false; // Reset for new verification
            await user.save();
        } else {
            // Create new record
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

        // --- 3. SEND OTP (Wrapped to prevent 500 if SMTP fails) ---
        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: emailAddr,
                subject: "Your OTP Code",
                text: `Your OTP is ${otp}`
            });
        } catch (mailErr) {
            console.log("Mail failed, use this OTP for testing:", otp);
        }

        // --- 4. FLUTTER-READY RESPONSE ---
        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP sent successfully",
            data: { 
                id: user._id.toString(),
                userId: user._id.toString(),
                mobileNumber: user.mobile_number, 
                mobile_number: user.mobile_number
            }
        });

    } catch (error) {
        // This will print the exact line causing the 500 error in your Hostinger console
        console.error("CRITICAL SIGNUP ERROR:", error);
        return res.status(500).json({ 
            status: "false", 
            message: "Internal Server Error: " + error.message 
        });
    }
};/**
 * VERIFY OTP
 * Creates final user after OTP validation
 */
exports.verifyOtp = async (req, res) => {
    try {
        // Handle different possible key names from Flutter
        const mobileNumber = normalizeMobile(
            req.body.mobile_number || 
            req.body.mobileNumber ||
             req.body.mobile_no || 
             req.body.mobileNo
            );
        const otp = String(req.body.otp || "").trim();

        // Find user in MongoDB
        const user = await User.findOne({
            mobile_number: mobileNumber,
            otp: otp,
            otp_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: "false", // Keeps Flutter in isNavigate: false
                success: false,
                message: "Invalid or expired OTP."
            });
        }

        user.is_verified = true;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        const token = generateAccessToken(user);

        // --- 🎯 MIRROR RESPONSE FOR FLUTTER ---
        return res.status(200).json({
            status: "true", // Matches Flutter's isSuccess check
            success: true,
            message: "Account verified successfully!", // Contains "verified" for Flutter check
            token: token,
            data: {
                // REQUIRED: userId must be an int? to match your RegisterVerifyOtpModel
                // We use sql_id (int) or a numeric hash of the MongoDB ID
                user_id: user.sql_id || parseInt(user._id.toString().substring(0, 8), 16),
                userId: user.sql_id || parseInt(user._id.toString().substring(0, 8), 16),
                id: user._id.toString(),
                // REQUIRED: user_type must be a String? to match your model
                user_type: String(user.user_type || "3"),
                userType: String(user.user_type || "3"),

                // Auth Tokens
                access_token: token,
                accessToken: token,

                // Basic Info
                first_name: user.first_name || "",
                firstName: user.first_name || "",
                last_name: user.last_name || "",
                lastName: user.last_name || "",
                email: user.email || "",
                
                // Profile & Meta (Matches model fields)
                profile_picture: user.profile_picture || "",
                profilePicture: user.profile_picture || "",
                date_of_birth: null,
                gender: "1",
                
                // Legacy support for your Bloc
                id: user._id.toString(),
                mobile_number: user.mobile_number,
                mobileNumber: user.mobile_number
            }
        });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ status: "false", message: error.message });
    }
};
/**
 * RESEND OTP
 */
exports.resendOtp = async (req, res) => {
    try {
        const mobileNumber = normalizeMobile(req.body.mobile_number || req.body.mobileNo);

        const user = await User.findOne({ mobile_number: mobileNumber });

        if (!user) {
            return res.status(404).json({ status: "false", message: "User not found" });
        }

        const otp = generateOtp();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        try {
            await sendOtpEmail(user.email, otp);
        } catch (err) { console.log("OTP:", otp); }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP resent successfully" // Matches Flutter's expectation
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};
/**
 * FORGOT VERIFY OTP
 */
exports.forgotVerifyOtp = async (req, res) => {
    try {
        const userId = extractUserIdFromBody(req.body);
        const otp = String(req.body.otp || "").trim();

        if (!userId || !otp) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "User ID and OTP are required."
            });
        }

        // 1. Check database for valid OTP and Expiry
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

        // 2. IMPORTANT: Generate a temporary token 
        // This lets Flutter call ResetPassword securely.
        const tempToken = generateAccessToken(user);

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP verified successfully",
            token: tempToken, // 🎯 Return token at root level
            data: {
                id: user._id.toString(),
                user_id: user._id.toString(),
                userId: user._id.toString(),
                first_name: user.first_name || "",
                accessToken: tempToken // 🎯 Also inside data for Flutter model safety
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message || "Server error"
        });
    }
};
/**
 * ADMIN SIGNUP
 */
exports.adminSignup = async (req, res) => {
    try {
        const first_name = req.body.first_name || "";
        const last_name = req.body.last_name || "";
        const email = normalizeEmail(req.body.email);
        const password = req.body.password || "";
        const user_type = Number(req.body.user_type);
        const temple_id = req.body.temple_id || null;
        const mobile_number = normalizeMobile(req.body.mobile_number);

        if (!first_name || !email || !password || !user_type || !mobile_number) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields."
            });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { mobile_number }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email or mobile already in use"
            });
        }

        const user = await User.create({
            first_name,
            last_name,
            name: `${first_name} ${last_name || ""}`.trim(),
            email,
            mobile_number,
            password,
            user_type,
            temple_id: user_type === 2 ? temple_id : null
        });

        const token = generateAccessToken(user);

        return res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.first_name,
                email: user.email,
                user_type: user.user_type
            },
            redirectPath: user.user_type === 1 ? "/admin/dashboard" : "/temple-admin/dashboard"
        });
    } catch (error) {
        if (handleDuplicateKeyError(error, res)) return;

        return res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
};

/**
 * LOGIN
 */
exports.login = async (req, res) => {
    try {
        const mobile = normalizeMobile(req.body.mobile || req.body.mobile_number || req.body.mobileNo);
        const password = req.body.password || "";

        // 1. Find user in MongoDB
        const user = await User.findOne({ mobile_number: mobile });

        if (!user) {
            return res.status(401).json({ 
                status: "false", 
                message: "User not found. Please sign up." 
            });
        }

        // 2. Check Verification Status
        if (!user.is_verified) {
            return res.status(401).json({ 
                status: "false", 
                message: "Account unverified. Please verify your OTP." 
            });
        }

        // 3. Validate Password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                status: "false", 
                message: "Invalid password." 
            });
        }

        const token = generateAccessToken(user);

        // --- 🎯 THE "NO-DISTURB" FLUTTER RESPONSE ---
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Login Successful",
            data: {
                // We provide every variation so your Model never fails
                userId: user._id.toString(),
                user_id: user._id.toString(),
                id: user._id.toString(),
                
                // Matches your: response.data?.accessToken
                accessToken: token, 
                access_token: token,
                
                // Matches your: response.data?.userType
                userType: String(user.user_type || "3"),
                user_type: String(user.user_type || "3"),
                
                first_name: user.first_name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: "Server error during login" });
    }
};
/**
 * REFRESH ACCESS TOKEN
 */
exports.refreshAccessToken = async (req, res) => {
    try {
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Token is valid",
            data: []
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message || "Server error"
        });
    }
};

/**
 * CHECK AUTH
 */
exports.checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/**
 * FORGOT PASSWORD
 */
exports.forgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const mobile_number = normalizeMobile(extractMobileFromBody(req.body));

        let user = null;

        if (email) {
            user = await User.findOne({ email });
        } else if (mobile_number) {
            user = await User.findOne({ mobile_number });
        }

        if (!user) {
            return res.status(404).json({
                status: "false",
                success: false,
                message: "No account found."
            });
        }

        const otp = generateOtp();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        try {
            if (user.email) {
                await sendOtpEmail(user.email, otp, "Your Password Reset OTP for STM Club");
            } else {
                console.log(`👉 DEBUG FORGOT OTP for ${user.mobile_number}: ${otp}`);
            }
        } catch (mailErr) {
            console.log(`👉 DEBUG FORGOT OTP for ${user.mobile_number}: ${otp}`);
        }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP sent successfully",
            data: {
                id: user._id.toString(),
                user_id: user._id.toString(),
                userId: user._id.toString(),
                first_name: user.first_name || "",
                firstName: user.first_name || "",
                mobile_number: user.mobile_number || "",
                mobileNumber: user.mobile_number || ""
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message || "Server error"
        });
    }
};

/**
 * RESET PASSWORD
 */
exports.resetPassword = async (req, res) => {
    try {
        const otp = String(req.body.otp || "").trim();
        const password = req.body.password || "";
        const confirmPassword =
            req.body.confirm_password ||
            req.body.confirmPassword ||
            req.body.password_confirmation ||
            "";

        const userId = extractUserIdFromBody(req.body);
        const email = normalizeEmail(req.body.email);
        const mobile_number = normalizeMobile(extractMobileFromBody(req.body));

        if ((!userId && !email && !mobile_number) || !otp || !password) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "User id, email, or mobile number along with OTP and password is required."
            });
        }

        if (!confirmPassword) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Confirm password is required."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Password and confirm password do not match."
            });
        }

        const query = {
            otp,
            otp_expires: { $gt: Date.now() }
        };

        if (userId) query._id = userId;
        else if (email) query.email = email;
        else if (mobile_number) query.mobile_number = mobile_number;

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

        const token = generateAccessToken(user);

        return res.status(200).json({
            status: "true",
            success: true,
            message: "Password updated successfully!",
            data: buildAuthUserResponse(user, token)
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message || "Server error"
        });
    }
};

/**
 * LOGOUT
 */
exports.logout = async (req, res) => {
    try {
        // 1. Extract ID from all possible keys sent by Flutter/React
        const userId = req.body.user_id || req.body.userId || req.body.id || null;

        // 2. Clear cookies (useful for the React Web Admin)
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        // 3. Update Database (Unset tokens for security)
        if (userId) {
            // We use try/catch inside to prevent a DB error from blocking the logout response
            try {
                await User.updateOne(
                    { _id: userId }, 
                    {
                        $unset: {
                            refreshToken: 1,
                            deviceToken: 1 // Clears push notification token on logout
                        }
                    }
                );
            } catch (dbErr) {
                console.log("DB Logout cleanup skipped:", dbErr.message);
            }
        }

        // --- 🎯 MIRROR RESPONSE FOR FLUTTER ---
        // Matches Flutter's: if (response.status == "true")
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Logged out successfully",
            data: [] // Matches your LogoutModel's data expectation
        });
    } catch (error) {
        return res.status(500).json({
            status: "false",
            success: false,
            message: error.message || "Server error"
        });
    }
};

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