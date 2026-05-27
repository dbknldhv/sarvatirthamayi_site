const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { sendSMS } = require("../../utils/smsProvider"); 

// --- HELPER: FORMAT FILE SYSTEM PATHS TO FULL PUBLIC WEB URLS ---
const getFullImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? "https://api.sarvatirthamayi.com" 
    : "http://localhost:5000";

  return `${baseUrl}/${path.replace(/\\/g, "/")}`;
};

// --- NODEMAILER SMTP ENGINE TRANSPORT ---
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10) || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// --- AUTHENTICATION: SIGNUP & SEND OTP ---
exports.signupUser = async (req, res) => {
  try {
    const { first_name, last_name, email, mobile_number, password } = req.body;

    if (!first_name || !mobile_number || !email || !password) {
      return res.status(400).json({ status: "false", success: false, message: "Required fields are missing." });
    }

    const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
    const cleanEmail = String(email).toLowerCase().trim();

    let user = await User.findOne({ $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }] });

    if (user && user.is_verified) {
      return res.status(400).json({ status: "false", success: false, message: "User already exists and is verified." });
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
      user.mobile_number = cleanMobile;
    } else {
      user = new User({
        first_name,
        last_name: last_name || "",
        email: cleanEmail,
        mobile_number: cleanMobile,
        password,
        user_type: 3
      });
      user.otp = otp;
      user.otp_expires = otpExpires;
    }

    await user.save();

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: cleanEmail,
        subject: "Verify Your Account - STM Club",
        html: `<h1>Your Verification Code is: ${otp}</h1>`,
      });
    } catch (mailError) {
      console.error("❌ SMTP Error:", mailError.message);
    }

    try {
        await sendSMS(cleanMobile, otp);
    } catch (smsError) {
        console.error("❌ SMS Error:", smsError.message);
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "OTP generated successfully. Check your email and mobile.",
      data: { 
        id: user._id.toString(),
        userId: user._id.toString(),
        sql_id: user.sql_id,
        mobile_number: cleanMobile 
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

// --- VERIFY OTP ---
exports.verifyOtp = async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;
    if (!mobile_number || !otp) {
      return res.status(400).json({ status: "false", success: false, message: "Mobile number and OTP are required." });
    }

    const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
    const user = await User.findOne({ mobile_number: cleanMobile, otp });

    if (!user) return res.status(400).json({ status: "false", success: false, message: "Invalid code." });
    if (!user.otp_expires || new Date() > user.otp_expires) {
      return res.status(400).json({ status: "false", success: false, message: "Code expired." });
    }

    user.is_verified = true;
    user.otp = null;
    user.otp_expires = null;
    
    await user.save();

    const token = jwt.sign({ id: user._id, sql_id: user.sql_id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Account verified successfully!",
      token,
      data: {
        userId: String(user.sql_id),
        user_id: String(user.sql_id),
        mongoId: user._id.toString(),
        accessToken: token,
        access_token: token,
        first_name: user.first_name || "",
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

// --- RESEND OTP ---
exports.resendOtp = async (req, res) => {
  try {
    const { mobile_number } = req.body;
    if (!mobile_number) return res.status(400).json({ status: "false", message: "Mobile required." });

    const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
    const user = await User.findOne({ mobile_number: cleanMobile });

    if (!user) return res.status(404).json({ status: "false", message: "User not found" });

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = newOtp;
    user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: "New Verification Code",
      html: `<h1>${newOtp}</h1>`,
    }).catch(err => console.error("Mail Error:", err.message));

    await sendSMS(cleanMobile, newOtp);

    return res.status(200).json({ status: "true", success: true, message: "New code sent." });
  } catch (error) {
    return res.status(500).json({ status: "false", message: error.message });
  }
};

// --- LOGIN ---
exports.loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "").slice(-10) : "";

    if (!cleanMobile || !password) {
      return res.status(400).json({ status: "false", success: false, message: "Mobile and password are required." });
    }

    const user = await User.findOne({ mobile_number: cleanMobile });

    if (!user) {
      return res.status(401).json({ status: "false", success: false, message: "User not found." });
    }

    if (!user.is_verified) {
      return res.status(401).json({ status: "false", success: false, message: "Account unverified." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ status: "false", success: false, message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: user._id, sql_id: user.sql_id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Login Successful",
      token,
      data: {
        userId: String(user.sql_id),
        user_id: String(user.sql_id),
        mongoId: user._id.toString(),
        first_name: user.first_name || user.name || "",
        last_name: user.last_name || "",
        userType: user.user_type,
        user_type: user.user_type,
        accessToken: token,
        access_token: token,
        email: user.email || "",
        profile_picture: getFullImageUrl(user.profile_picture || ""),
      },
      user: {
        ...userResponse,
        id: user._id,
        name: user.name || `${user.first_name} ${user.last_name || ''}`.trim()
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

// --- PROFILE MANAGEMENT ---
exports.getProfile = async (req, res) => {
  try {
    const searchId = req.user.id || req.user._id;

    if (!searchId) {
      return res.status(401).json({ status: "false", success: false, message: "Unauthorized token context context mapping error." });
    }

    const user = await User.findById(searchId).select("-password").lean();

    if (!user) {
      return res.status(404).json({ status: "false", success: false, message: "User not found" });
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Profile retrieved successfully.",
      data: {
        user_id: user.sql_id || 0,
        userId: user.sql_id || 0,
        id: user._id.toString(),
        mongo_id: user._id.toString(),
        first_name: user.first_name || "",
        firstName: user.first_name || "",
        last_name: user.last_name || "",
        lastName: user.last_name || "",
        name: user.name || `${user.first_name} ${user.last_name || ''}`.trim(),
        email: user.email || "",
        mobile_number: user.mobile_number || "",
        mobileNumber: user.mobile_number || "",
        date_of_birth: user.date_of_birth || "",
        dateOfBirth: user.date_of_birth || "",
        gender: String(user.gender || "1"),
        user_type: String(user.user_type || "3"),
        userType: String(user.user_type || "3"),
        role: user.role || "user",
        profile_picture: user.profile_picture ? getFullImageUrl(user.profile_picture) : "",
        profilePicture: user.profile_picture ? getFullImageUrl(user.profile_picture) : "",
        banner_image: user.banner_image ? getFullImageUrl(user.banner_image) : "",
        is_verified: user.is_verified || false
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

// 🔥 TRACEABLE PROFILE UPDATE CONTROLLER METHOD WITH DETAILED LOGGER LAYERS
exports.updateProfile = async (req, res) => {
  // 🎯 Layer 1: Track payload metrics received from MultiPart forms
  console.log("==================================================");
  console.log("🚀 Incoming Update Profile Request Traced");
  console.log("📱 Text Fields (req.body):", JSON.stringify(req.body, null, 2));
  console.log("🖼️ Single File Fallback (req.file):", req.file ? {
    fieldname: req.file.fieldname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size
  } : "None");
  console.log("🗂️ Multiple Fields (req.files):", req.files ? Object.keys(req.files).map(key => ({
    field: key,
    filesCount: req.files[key].length,
    details: req.files[key].map(f => ({ name: f.filename, path: f.path, size: f.size }))
  })) : "None");
  console.log("==================================================");

  try {
    const searchId = req.user?.id || req.user?._id;

    // 🎯 Layer 2: Catch missing Auth Context session parameters
    if (!searchId) {
      console.error("❌ Auth Error: req.user validation lookup context is missing or null!");
      return res.status(401).json({ 
        status: "false", 
        success: false, 
        message: "Unauthorized lookup block. Session might be invalid." 
      });
    }

    const user = await User.findById(searchId);
    
    // 🎯 Layer 3: Catch missing Database Records
    if (!user) {
      console.error(`❌ DB Error: User with ID ${searchId} not found in MongoDB collection.`);
      return res.status(404).json({ 
        status: "false", 
        success: false, 
        message: "User profile records not found." 
      });
    }

    const { first_name, last_name, email, mobile_number, date_of_birth, gender } = req.body;

    // Apply plain text parameter updates safely
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (email !== undefined) user.email = String(email).toLowerCase().trim();
    if (date_of_birth !== undefined) user.date_of_birth = date_of_birth;
    if (gender !== undefined) user.gender = String(gender);
    
    if (mobile_number !== undefined) {
      user.mobile_number = String(mobile_number).replace(/\D/g, "").slice(-10);
    }

    // 🎯 Layer 4: Explicit Multer incoming buffer tracers mapping to storage
    if (req.files) {
      if (req.files.profile_picture && req.files.profile_picture.length > 0) {
        console.log(`💾 Mapping Profile Pic to DB Path: ${req.files.profile_picture[0].path}`);
        user.profile_picture = req.files.profile_picture[0].path;
      }
      if (req.files.banner_image && req.files.banner_image.length > 0) {
        console.log(`💾 Mapping Banner Image to DB Path: ${req.files.banner_image[0].path}`);
        user.banner_image = req.files.banner_image[0].path;
      }
    } else if (req.file) {
      console.log(`💾 Fallback Single File Mapping to DB Path: ${req.file.path}`);
      user.profile_picture = req.file.path;
    }

    // Save triggers recalculation and schema hooks
    const updatedUser = await user.save();
    console.log("✅ MongoDB document saved successfully for user:", searchId);

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Profile updated successfully.",
      data: {
        user_id: updatedUser.sql_id,
        userId: updatedUser.sql_id,
        id: updatedUser._id.toString(),
        mongo_id: updatedUser._id.toString(),
        first_name: updatedUser.first_name || "",
        last_name: updatedUser.last_name || "",
        email: updatedUser.email || "",
        mobile_number: updatedUser.mobile_number || "",
        date_of_birth: updatedUser.date_of_birth || "",
        gender: String(updatedUser.gender || "1"),
        user_type: String(updatedUser.user_type || "3"),
        profile_picture: updatedUser.profile_picture ? getFullImageUrl(updatedUser.profile_picture) : "",
        banner_image: updatedUser.banner_image ? getFullImageUrl(updatedUser.banner_image) : ""
      },
    });

  } catch (error) {
    // 🎯 Layer 5: Comprehensive Catch Block Tracker for crashes or database constraint checks
    console.error("🔥 CRITICAL CONTROLLER CRASH CAPTURED 🔥");
    console.error("🚨 Error Name:", error.name);
    console.error("🚨 Error Message:", error.message);
    console.error("🚨 Stack Trace:\n", error.stack);
    console.log("==================================================");

    return res.status(500).json({ 
      status: "false", 
      success: false, 
      type: error.name,
      message: `Internal Server Error: ${error.message}` 
    });
  }
};

// --- PASSWORD RECOVERY FLOWS ---
exports.forgotPassword = async (req, res) => {
    try {
        const { email, mobile_number } = req.body;
        let query = {};

        if (email) {
            query = { email: email.toLowerCase().trim() };
        } else if (mobile_number) {
            const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
            query = { mobile_number: new RegExp(cleanMobile + '$') }; 
        } else {
            return res.status(400).json({ status: "false", message: "Email or Mobile identifier tracking input required." });
        }

        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ status: "false", success: false, message: "No account matched." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: user.email,
                subject: "Reset Password OTP",
                html: `<h1>Your Reset Code: ${otp}</h1>`
            });
        } catch (mailErr) {
            console.log(`❌ SMTP Mail engine delivery fallback loop warning. Use this OTP: ${otp}`);
        }

        res.status(200).json({ 
            status: "true", 
            success: true, 
            message: "OTP sent successfully",
            data: { 
                id: user._id.toString(), 
                first_name: user.first_name || "",
                mobile_number: user.mobile_number 
            } 
        });
    } catch (error) { 
        res.status(500).json({ status: "false", success: false, message: error.message }); 
    }
};

exports.forgotVerifyOtp = async (req, res) => {
    try {
        const { user_id, otp } = req.body;
        const user = await User.findById(user_id);

        if (!user || user.otp !== otp || user.otp_expires < Date.now()) {
            return res.status(400).json({ status: "false", message: "Invalid or expired OTP" });
        }

        res.status(200).json({ 
            status: "true", 
            success: true, 
            message: "OTP Verified",
            data: { otp: otp } 
        });
    } catch (error) { 
        res.status(500).json({ status: "false", message: error.message }); 
    }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({ status: "false", success: false, message: "Email, OTP and new password variables required." });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail, otp });

    if (!user || !user.otp_expires || new Date() > user.otp_expires) {
      return res.status(400).json({ status: "false", success: false, message: "Invalid/Expired OTP parameters handled." });
    }

    user.password = new_password; 
    user.otp = null;
    user.otp_expires = null;
    await user.save();

    return res.status(200).json({ status: "true", success: true, message: "Password updated successfully!" });
  } catch (error) {
    return res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

// --- LOGOUT ---
exports.logoutUser = async (req, res) => {
  try {
    return res.status(200).json({ status: "true", success: true, message: "Logged out successfully", data: [] });
  } catch (error) {
    return res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

// --- ADMIN SYSTEM ENDPOINTS ---
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 }).select("-password");
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User metrics data not found" });

    const updateData = { ...req.body };
    Object.assign(user, updateData);

    if (req.files) {
        if (req.files.profile_picture) user.profile_picture = req.files.profile_picture[0].path;
        if (req.files.banner_image) user.banner_image = req.files.banner_image[0].path;
    } else if (req.file) {
        user.profile_picture = req.file.path;
    }

    await user.save();
    return res.status(200).json({ success: true, message: "User Updated!", data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "User Deleted Successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Delete action execution failed" });
  }
};

// --- STUB ROUTE CONTROLLERS RETAINED FOR ROUTER CONTINUITY MAPS ---
exports.getAllRituals = async (req, res) => res.status(200).json({ success: true, data: [] });
exports.getMembershipPlans = async (req, res) => res.status(200).json({ success: true, data: [] });
exports.getAssistantsByTemple = async (req, res) => res.status(200).json({ success: true, data: [] });
exports.bookRitual = async (req, res) => res.status(200).json({ success: true, message: "Booking received!" });
exports.purchaseMembership = async (req, res) => res.status(200).json({ success: true, message: "Purchase successful!" });