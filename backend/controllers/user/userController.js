const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../../config/db");

// --- 1. EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 465, // Gmail SSL port
    secure: true, 
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS // 16-character App Password
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// --- 2. AUTHENTICATION: SIGNUP & SEND OTP ---

exports.signupUser = async (req, res) => {
    try {
        const { first_name, last_name, email, mobile_number, password } = req.body;

        // Validation
        if (!first_name || !mobile_number || !email || !password) {
            return res.status(400).json({ success: false, message: "Required fields are missing." });
        }

        const cleanMobile = mobile_number.replace(/\D/g, '').slice(-10);
        const cleanEmail = email.toLowerCase().trim();

        // Check for existing user
        let user = await User.findOne({ 
            $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }] 
        });
        
        if (user && user.is_verified) {
            return res.status(400).json({ success: false, message: "User already exists and is verified." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            user.first_name = first_name;
            user.last_name = last_name || "";
            user.password = password; 
            user.otp = otp;
            user.otp_expires = otpExpires;
            user.email = cleanEmail;
        } else {
            user = new User({
                first_name,
                last_name: last_name || "",
                email: cleanEmail,
                mobile_number: cleanMobile,
                password,
                user_type: 3,
                is_verified: false,
                otp,
                otp_expires: otpExpires
            });
        }

        // Save User to Database
        await user.save();
        
        // 🎯 SAFETY: Wrap email in separate catch so SMTP failure won't crash signup
        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: cleanEmail,
                subject: "Verify Your Account - STM Club",
                html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
                        <h2 style="color:#7c3aed;">Verification Code</h2>
                        <h1 style="background:#f3f4f6; padding:10px; text-align:center; letter-spacing:5px;">${otp}</h1>
                        <p>Valid for 10 minutes.</p>
                       </div>`
            });
            console.log(`✅ OTP sent to ${cleanEmail}`);
        } catch (mailError) {
            console.error("❌ NODEMAILER ERROR:", mailError.message);
            console.log(`👉 DEBUG OTP: ${otp}`);
        }

        res.status(200).json({ 
            status: "true",
            success: true, 
            message: "OTP generated successfully. Check your email." ,
        data: {
        id: user._id.toString(), 
        userId: user._id.toString(),
        user_id: user._id.toString(),
        
        first_name: user.first_name,
        email: cleanEmail || user.email,
        mobile_number: cleanMobile
    }
        });

    } catch (error) {
        console.error("🔥 BACKEND SIGNUP CRASH:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 3. VERIFY OTP ---
exports.verifyOtp = async (req, res) => {
    try {
        const { mobile_number, otp } = req.body;
        if (!mobile_number || !otp) return res.status(400).json({ success: false, message: "Mobile and OTP are required." });

        const cleanMobile = mobile_number.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ mobile_number: cleanMobile, otp });

        //const user = await User.findOne({ mobile_number: mobile_number.trim(), otp });

        if (!user) return res.status(400).json({ success: false, message: "Invalid verification code." });
        if (new Date() > user.otp_expires) return res.status(400).json({ success: false, message: "Code expired." });

        user.is_verified = true;
        user.otp = null; 
        user.otp_expires = null;
        await user.save();

        res.status(200).json({ success: true, message: "Account verified successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 4. RESEND OTP ---
exports.resendOtp = async (req, res) => {
    try {
        const { mobile_number } = req.body;
        const user = await User.findOne({ mobile_number: mobile_number.trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = newOtp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        try {
            const recipientEmail = user.email || process.env.MAIL_USER;
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: recipientEmail,
                subject: "New Verification Code",
                html: `<h1>${newOtp}</h1>`
            });
        } catch (err) { console.log("Resend Mail Error", err.message); }

        res.status(200).json({ success: true, message: "New code sent." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 5. LOGIN (Supporting React & Flutter) ---
// --- 5. LOGIN (Supporting React Admin & Flutter App) ---
exports.loginUser = async (req, res) => {
    try {
        const { mobile, password } = req.body;
        //const user = await User.findOne({ mobile_number: mobile?.trim() });
        const cleanMobile = mobile ? mobile.replace(/\D/g, '').slice(-10) : "";
        const user = await User.findOne({ mobile_number: cleanMobile });
        if (!user) return res.status(401).json({ success: false, message: "User not found." });
        if (!user.is_verified) return res.status(401).json({ success: false, message: "Account unverified." });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        let redirectPath = "/";
        let userTypeInt = 3; // Default for regular users

        // Mapping Logic for both platforms
        if (user.role === 'admin') {
            redirectPath = "/admin/dashboard";
            userTypeInt = 1;
        } else if (user.role === 'temple-admin') {
            redirectPath = "/temple/dashboard";
            userTypeInt = 2;
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        // --- THE UNIVERSAL JSON RESPONSE ---
        res.status(200).json({ 
            status: "true",              // Flutter checks this string
            success: true,               // React uses this boolean
            message: "Login Successful", // Matches Flutter's Constants.loginSuccessful
            token: token,                // Root level for React
            //redirectPath,
            
            // 🎯 FLUTTER DATA OBJECT (Matches LoginModel & LoginBloc)
            data: {                   
                userId: user._id.toString(),
                user_id: user._id.toString(),
                first_name: user.first_name || user.name || "",
                last_name: user.last_name || "",
                userType: user.role === 'admin' ? 1 : (user.role === 'temple-admin' ? 2 : 3),
                user_type: user.role === 'admin' ? 1 : (user.role === 'temple-admin' ? 2 : 3),
                accessToken: token, 
                access_token: token,
                accesstoken: token,  
                email: user.email,
                profile_picture: user.profile_picture || ""
            },

            // 🎯 REACT/ADMIN USER OBJECT
            user: {
                ...userResponse,
                email: user.email,
                name: user.first_name,
                id: user._id,
                role: user.role,         // React uses 'admin', 'temple-admin', or 'user'
                user_type: userTypeInt   // Backup for React
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: "false",
            success: false, 
            message: error.message 
        });
    }
};

// --- 6. PROFILE MANAGEMENT ---
// backend/controllers/user/userController.js
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password").lean(); 

        if (!user) {
            return res.status(404).json({ status: "false", success: false, message: "User not found" });
        }

        const formattedData = {
            user_id: user.sql_id || 0,
            first_name: String(user.first_name || ""),
            last_name: String(user.last_name || ""),
            email: String(user.email || ""),
            mobile_number: user.mobile_number ? String(user.mobile_number) : "",
            date_of_birth: user.date_of_birth ? String(user.date_of_birth) : "",
            gender: user.gender !== undefined ? String(user.gender) : "1",
            user_type: user.user_type !== undefined ? String(user.user_type) : "3",
            profile_picture: user.profile_picture ? String(user.profile_picture) : "",
            profile_picture_thumb: user.profile_picture ? String(user.profile_picture) : ""
        };

        res.status(200).json({ 
            status: "true",
            success: true, 
            // 🎯 FIXED: Matches Constants.profileSuccessMsg exactly
            message: "Profile retrieved successfully.", 
            data: formattedData
        });

    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, email, mobile_number, date_of_birth, gender } = req.body;

        // 1. Prepare the update object
        let updateData = {
            first_name,
            last_name,
            email,
            mobile_number,
            date_of_birth,
            gender: gender ? String(gender) : "1", // Flutter sends gender as 1, 2, or 3
            name: `${first_name} ${last_name}`.trim()
        };

        // 2. Handle File Upload (Profile Picture)
        // If your middleware uses upload.fields([{ name: 'profile_picture' }])
        if (req.files && req.files['profile_picture']) {
            updateData.profile_picture = req.files['profile_picture'][0].path;
        } 
        // If your middleware uses upload.single('profile_picture')
        else if (req.file) {
            updateData.profile_picture = req.file.path;
        }

        // 3. Update User in MongoDB
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedUser) {
            return res.status(404).json({ status: "false", message: "User not found" });
        }

        // 4. Format for UpdateProfileModel in Flutter
        const formattedData = {
            user_id: updatedUser.sql_id || 0,
            first_name: updatedUser.first_name || "",
            last_name: updatedUser.last_name || "",
            email: updatedUser.email || "",
            mobile_number: String(updatedUser.mobile_number || ""),
            date_of_birth: updatedUser.date_of_birth || "",
            gender: String(updatedUser.gender || "1"),
            user_type: String(updatedUser.user_type || "3"),
            profile_picture: updatedUser.profile_picture || "",
            profile_picture_thumb: updatedUser.profile_picture || ""
        };

        res.status(200).json({
            status: "true",
            success: true,
            // 🎯 Match Constants.profileUpdateSuccessMsg
            message: "Profile updated successfully.", 
            data: formattedData
        });

    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ 
            status: "false", 
            success: false, 
            message: error.message 
        });
    }
};

// --- 7. PASSWORD RECOVERY ---
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
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

// --- 8. ADMIN CRUD OPS ---
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

exports.updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select("-password");
        res.status(200).json({ success: true, message: "User Updated!", data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
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

// --- 9. SQL DATA FETCHING ---
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

exports.bookRitual = async (req, res) => res.status(200).json({ success: true, message: "Booking received!" });
exports.purchaseMembership = async (req, res) => res.status(200).json({ success: true, message: "Purchase successful!" });