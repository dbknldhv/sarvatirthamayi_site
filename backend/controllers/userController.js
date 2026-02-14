const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_PORT == 465,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// --- AUTHENTICATION FLOW ---

exports.signupUser = async (req, res) => {
    try {
        const { first_name, last_name, email, mobile_number, password } = req.body;

        if (!first_name || !mobile_number || !email || !password) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const cleanMobile = mobile_number.trim();
        const cleanEmail = email.toLowerCase().trim();

        let user = await User.findOne({ $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }] });
        
        if (user && user.is_verified) {
            return res.status(400).json({ success: false, message: "User already registered and verified." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            user.first_name = first_name;
            user.last_name = last_name || "";
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
                otp,
                otp_expires: otpExpires
            });
        }

        await user.save();
        
        // OTP Mail
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: cleanEmail,
            subject: "Verify Your Account",
            html:  `<div style="font-family: sans-serif; text-align: center;">
                    <h2>Verify Your Account</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #f05a28; letter-spacing: 5px;">${otp}</h1>
                    <p>Valid for 10 minutes.</p>
                   </div>`
        });

        res.status(200).json({ success: true, message: "Verification code sent to email." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.otp !== otp || user.otp_expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.is_verified = true;
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: "Account verified successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const user = await User.findOne({ mobile_number: mobile?.trim() });

        if (!user) return res.status(401).json({ success: false, message: "User not found." });
        if (!user.is_verified && user.user_type !== 1) {
            return res.status(401).json({ success: false, message: "Please verify your account first." });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        res.status(200).json({ 
            success: true, 
            token, 
            role: user.role,
            redirectPath: user.user_type === 1 ? "/admin/dashboard" : "/user/dashboard",
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 1. Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

// 2. Get User By ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
};

// 3. Update User
exports.updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        ).select("-password");
        res.status(200).json({ message: "User Updated Successfully!", data: updatedUser });
    } catch (error) {
        res.status(400).json({ message: "Update failed", error: error.message });
    }
};

// 4. Delete User
exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User Deleted Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Delete failed" });
    }
};