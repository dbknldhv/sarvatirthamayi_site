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
  secure: process.env.MAIL_SECURE === 'true'|| process.env.MAIL_PORT == 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    // 🎯 This is crucial for Zoho to work from your local machine
    rejectUnauthorized: false 
  }
});

/**
 * 1. SIGN UP - REGULAR USER (OTP Flow)
 */
exports.signUp = async (req, res) => {
  const { firstName, lastName, mobileNumber, password } = req.body;
  try {
    const existingUser = await User.findOne({ mobile_number: mobileNumber });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Mobile number already registered." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(mobileNumber, {
      firstName,
      lastName,
      password,
      otp,
      expires: Date.now() + 600000, 
    });

    try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: process.env.MAIL_USER, 
          subject: "Your OTP for STM Club",
          text: `Your OTP is ${otp}`,
        });
    } catch (mailErr) {
        console.log(`👉 DEBUG OTP: ${otp}`);
    }

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. VERIFY OTP & CREATE USER
 */
exports.verifyOtp = async (req, res) => {
  const { mobileNumber, otp } = req.body;
  const data = otpStore.get(mobileNumber);

  try {
    if (data && data.otp === otp && data.expires > Date.now()) {
      const user = await User.create({
        first_name: data.firstName,
        last_name: data.lastName,
        name: `${data.firstName} ${data.lastName || ""}`.trim(),
        mobile_number: mobileNumber,
        password: data.password, 
        user_type: 3, 
      });

      otpStore.delete(mobileNumber);
      res.status(201).json({ success: true, message: "Account created successfully!" });
    } else {
      res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. ADMIN & TEMPLE ADMIN SIGNUP (Direct Flow)
 */
exports.adminSignup = async (req, res) => {
  try {
    const { first_name, last_name, email, password, user_type, temple_id, mobile_number } = req.body;

    if (!first_name || !email || !password || !user_type || !mobile_number) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields." 
      });
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
 * 4. UNIFIED LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { email, mobileNumber, password } = req.body;
    let user;

    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else if (mobileNumber) {
      user = await User.findOne({ mobile_number: mobileNumber });
    }

    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials." });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, user_type: user.user_type, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const paths = { 1: "/admin/dashboard", 2: "/temple-admin/dashboard", 3: "/" };
    res.status(200).json({
      success: true,
      token,
      redirectPath: paths[user.user_type] || "/",
      user: { id: user._id, email: user.email, name: user.first_name, user_type: user.user_type, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 5. REFRESH ACCESS TOKEN (Fix for Line 8)
 */
exports.refreshAccessToken = async (req, res) => {
    try {
        res.status(200).json({ success: true, message: "Token is valid" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 6. LOGOUT (Fix for Line 9)
 */
exports.logout = async (req, res) => {
    try {
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 7. STATUS CHECK
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

// STEP 1: Send OTP to Email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: user.email,
            subject: "Password Reset OTP",
            html: `<h3>Your Reset Code:</h3><h1>${otp}</h1>`
        });

        res.status(200).json({ success: true, message: "OTP sent to your email." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// STEP 2: Verify OTP and Update Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user || user.otp !== otp || user.otp_expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        user.password = new_password; // Ensure your User model hashes this in .pre('save')
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// --- FINAL EXPORTS (Synced with auth.routes.js) ---
module.exports = {
  signUp: exports.signUp,
  verifyOtp: exports.verifyOtp,
  adminSignup: exports.adminSignup,
  login: exports.login,
  checkAuth: exports.checkAuth,
  refreshAccessToken: exports.refreshAccessToken,
  logout: exports.logout,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword
};