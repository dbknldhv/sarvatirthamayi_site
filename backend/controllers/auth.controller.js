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
        { expiresIn: "1d" }
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
        const {
            firstName,
            lastName,
            email,
            mobileNumber,
            password,
            confirmPassword
        } = extractSignupPayload(req.body);

        const sanitizedEmail = normalizeEmail(email);
        const sanitizedMobile = normalizeMobile(mobileNumber);

        if (!firstName || !sanitizedEmail || !sanitizedMobile || !password) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "First name, email, mobile number, and password are required."
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

        if (!/^\S+@\S+\.\S+$/.test(sanitizedEmail)) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Enter a valid email address."
            });
        }

        if (!/^\d{10}$/.test(sanitizedMobile)) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Enter a valid mobile number."
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { email: sanitizedEmail },
                { mobile_number: sanitizedMobile }
            ]
        });

        if (existingUser) {
            if (existingUser.email === sanitizedEmail) {
                return res.status(400).json({
                    status: "false",
                    success: false,
                    message: "Email already registered."
                });
            }

            if (existingUser.mobile_number === sanitizedMobile) {
                return res.status(400).json({
                    status: "false",
                    success: false,
                    message: "Mobile number already registered."
                });
            }
        }

        const otp = generateOtp();

        otpStore.set(sanitizedMobile, {
            firstName,
            lastName,
            email: sanitizedEmail,
            password,
            otp,
            expires: Date.now() + 10 * 60 * 1000
        });

        try {
            await sendOtpEmail(sanitizedEmail, otp);
        } catch (mailErr) {
            console.log(`👉 DEBUG SIGNUP OTP for ${sanitizedMobile}: ${otp}`);
        }

        return res.status(200).json({
            status: "true",
            success: true,
            message: "OTP sent successfully",
            data: buildTempSignupResponse(firstName, sanitizedMobile)
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
 * VERIFY OTP
 * Creates final user after OTP validation
 */
exports.verifyOtp = async (req, res) => {
    try {
        const mobileNumber = normalizeMobile(extractMobileFromBody(req.body));
        const otp = String(req.body.otp || "").trim();

        if (!mobileNumber || !otp) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Mobile number and OTP are required."
            });
        }

        const pendingSignup = otpStore.get(mobileNumber);

        if (!pendingSignup || pendingSignup.otp !== otp || pendingSignup.expires <= Date.now()) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { email: pendingSignup.email },
                { mobile_number: mobileNumber }
            ]
        });

        if (existingUser) {
            otpStore.delete(mobileNumber);

            if (existingUser.email === pendingSignup.email) {
                return res.status(400).json({
                    status: "false",
                    success: false,
                    message: "Email already registered."
                });
            }

            if (existingUser.mobile_number === mobileNumber) {
                return res.status(400).json({
                    status: "false",
                    success: false,
                    message: "Mobile number already registered."
                });
            }
        }

        let user;
        try {
            user = await User.create({
                first_name: pendingSignup.firstName,
                last_name: pendingSignup.lastName,
                name: `${pendingSignup.firstName} ${pendingSignup.lastName || ""}`.trim(),
                email: pendingSignup.email,
                mobile_number: mobileNumber,
                password: pendingSignup.password,
                user_type: 3,
                is_verified: true
            });
        } catch (error) {
            if (handleDuplicateKeyError(error, res)) return;
            throw error;
        }

        otpStore.delete(mobileNumber);

        const token = generateAccessToken(user);

        return res.status(201).json({
            status: "true",
            success: true,
            message: "Account created successfully!",
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
 * RESEND OTP
 */
exports.resendOtp = async (req, res) => {
    try {
        const mobileNumber = normalizeMobile(extractMobileFromBody(req.body));

        if (!mobileNumber) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Mobile number is required."
            });
        }

        const pendingSignup = otpStore.get(mobileNumber);

        if (!pendingSignup) {
            return res.status(404).json({
                status: "false",
                success: false,
                message: "User not found or signup session expired."
            });
        }

        const otp = generateOtp();

        otpStore.set(mobileNumber, {
            ...pendingSignup,
            otp,
            expires: Date.now() + 10 * 60 * 1000
        });

        try {
            await sendOtpEmail(pendingSignup.email, otp);
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
            message: error.message || "Server error"
        });
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
                message: "User id and OTP are required."
            });
        }

        const user = await User.findOne({
            _id: userId,
            otp,
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
        const email = normalizeEmail(req.body.email);
        const rawMobile = extractMobileFromBody(req.body);
        const mobile_number = normalizeMobile(rawMobile);
        const password = req.body.password || "";

        if ((!email && !mobile_number) || !password) {
            return res.status(400).json({
                status: "false",
                success: false,
                message: "Email or mobile number and password are required."
            });
        }

        let user = null;

        if (email) {
            user = await User.findOne({ email });
        } else if (mobile_number) {
            user = await User.findOne({ mobile_number });
        }

        if (!user) {
            return res.status(401).json({
                status: "false",
                success: false,
                message: "Invalid credentials."
            });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                status: "false",
                success: false,
                message: "Invalid credentials."
            });
        }

        const token = generateAccessToken(user);
        const redirectPaths = { 1: "/admin/dashboard", 2: "/temple-admin/dashboard", 3: "/" };

        return res.status(200).json({
            status: "true",
            success: true,
            message: "Login Successful",
            token,
            redirectPath: redirectPaths[user.user_type] || "/",
            data: buildAuthUserResponse(user, token),
            user: {
                id: user._id,
                email: user.email,
                name: user.first_name || "",
                user_type: user.user_type,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            status: "false",
            success: false,
            message: "Server error"
        });
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
        const userId = req.body.user_id || req.body.userId || null;

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

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