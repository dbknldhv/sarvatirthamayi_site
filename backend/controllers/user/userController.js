const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../../config/db");

const getFullImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://api.sarvatirthamayi.com/${path.replace(/\\/g, "/")}`;
};

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10) || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// --- HELPER: ENSURE LEGACY NUMERIC sql_id EXISTS ---
const ensureUserSqlId = async (user) => {
  if (user.sql_id && Number(user.sql_id) > 0) {
    return Number(user.sql_id);
  }

  const lastUser = await User.findOne({ sql_id: { $ne: null } })
    .sort({ sql_id: -1 })
    .select("sql_id");

  const nextSqlId = Number(lastUser?.sql_id || 0) + 1;
  user.sql_id = nextSqlId;
  await user.save();

  return nextSqlId;
};

// --- AUTHENTICATION: SIGNUP & SEND OTP ---
exports.signupUser = async (req, res) => {
  try {
    const { first_name, last_name, email, mobile_number, password } = req.body;

    if (!first_name || !mobile_number || !email || !password) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Required fields are missing.",
      });
    }

    const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
    const cleanEmail = String(email).toLowerCase().trim();

    let user = await User.findOne({
      $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }],
    });

    if (user && user.is_verified) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "User already exists and is verified.",
      });
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
        user_type: 3,
        is_verified: false,
        otp,
        otp_expires: otpExpires,
      });
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

    return res.status(200).json({
      status: "true",
      success: true,
      message: "OTP generated successfully. Check your email.",
      data: {
        id: user._id.toString(),
        userId: user._id.toString(),
        mobile_number: cleanMobile,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- VERIFY OTP ---
exports.verifyOtp = async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;

    if (!mobile_number || !otp) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Mobile number and OTP are required.",
      });
    }

    const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
    const user = await User.findOne({ mobile_number: cleanMobile, otp });

    if (!user) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Invalid verification code.",
      });
    }

    if (!user.otp_expires || new Date() > user.otp_expires) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Code expired.",
      });
    }

    user.is_verified = true;
    user.otp = null;
    user.otp_expires = null;

    const sqlId = await ensureUserSqlId(user);

    const token = jwt.sign(
      { id: user._id, sql_id: sqlId },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Account verified successfully!",
      token,
      data: {
        userId: String(sqlId),
        user_id: String(sqlId),
        mongoId: user._id.toString(),
        accessToken: token,
        access_token: token,
        accesstoken: token,
        first_name: user.first_name || "",
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- RESEND OTP ---
exports.resendOtp = async (req, res) => {
  try {
    const { mobile_number } = req.body;

    if (!mobile_number) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Mobile number is required.",
      });
    }

    const cleanMobile = String(mobile_number).replace(/\D/g, "").slice(-10);
    const user = await User.findOne({ mobile_number: cleanMobile });

    if (!user) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "User not found",
      });
    }

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
        html: `<h1>${newOtp}</h1>`,
      });
    } catch (err) {
      console.error("Resend Mail Error:", err.message);
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "New code sent.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- LOGIN ---
exports.loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "").slice(-10) : "";

    if (!cleanMobile || !password) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Mobile and password are required.",
      });
    }

    const user = await User.findOne({ mobile_number: cleanMobile });

    if (!user) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "User not found.",
      });
    }

    if (!user.is_verified) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Account unverified.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Invalid credentials.",
      });
    }

    const sqlId = await ensureUserSqlId(user);

    const token = jwt.sign(
      { id: user._id, sql_id: sqlId },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    let userTypeInt = 3;
    if (user.role === "admin") {
      userTypeInt = 1;
    } else if (user.role === "temple-admin") {
      userTypeInt = 2;
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Login Successful",
      token,
      data: {
        userId: String(sqlId),
        user_id: String(sqlId),
        mongoId: user._id.toString(),
        first_name: user.first_name || user.name || "",
        last_name: user.last_name || "",
        userType: userTypeInt,
        user_type: userTypeInt,
        accessToken: token,
        access_token: token,
        accesstoken: token,
        email: user.email || "",
        profile_picture: getFullImageUrl(user.profile_picture || ""),
      },
      user: {
        ...userResponse,
        email: user.email || "",
        name: user.first_name || user.name || "",
        id: user._id,
        sql_id: sqlId,
        role: user.role,
        user_type: userTypeInt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- LOGOUT ---
exports.logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      status: "true",
      success: true,
      message: "Logged out successfully",
      data: [],
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- PROFILE MANAGEMENT ---
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "User not found",
      });
    }

    const formattedData = {
      user_id: user.sql_id || 0,
      mongo_id: String(user._id || ""),
      first_name: String(user.first_name || ""),
      last_name: String(user.last_name || ""),
      email: String(user.email || ""),
      mobile_number: user.mobile_number ? String(user.mobile_number) : "",
      date_of_birth: user.date_of_birth ? String(user.date_of_birth) : "",
      gender: user.gender !== undefined ? String(user.gender) : "1",
      user_type: user.user_type !== undefined ? String(user.user_type) : "3",
      profile_picture: user.profile_picture ? getFullImageUrl(user.profile_picture) : "",
      profile_picture_thumb: user.profile_picture
        ? getFullImageUrl(user.profile_picture)
        : "",
    };

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Profile retrieved successfully.",
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      email,
      mobile_number,
      date_of_birth,
      gender,
    } = req.body;

    const updateData = {
      ...(first_name !== undefined ? { first_name } : {}),
      ...(last_name !== undefined ? { last_name } : {}),
      ...(email !== undefined ? { email: String(email).toLowerCase().trim() } : {}),
      ...(mobile_number !== undefined
        ? { mobile_number: String(mobile_number).replace(/\D/g, "").slice(-10) }
        : {}),
      ...(date_of_birth !== undefined ? { date_of_birth } : {}),
      ...(gender !== undefined ? { gender: String(gender) } : {}),
    };

    if (
      updateData.first_name !== undefined ||
      updateData.last_name !== undefined
    ) {
      const first = updateData.first_name ?? "";
      const last = updateData.last_name ?? "";
      updateData.name = `${first} ${last}`.trim();
    }

    if (req.files && req.files["profile_picture"]) {
      updateData.profile_picture = req.files["profile_picture"][0].path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "User not found",
      });
    }

    const formattedData = {
      user_id: updatedUser.sql_id || 0,
      mongo_id: String(updatedUser._id || ""),
      first_name: updatedUser.first_name || "",
      last_name: updatedUser.last_name || "",
      email: updatedUser.email || "",
      mobile_number: String(updatedUser.mobile_number || ""),
      date_of_birth: updatedUser.date_of_birth || "",
      gender: String(updatedUser.gender || "1"),
      user_type: String(updatedUser.user_type || "3"),
      profile_picture: updatedUser.profile_picture
        ? getFullImageUrl(updatedUser.profile_picture)
        : "",
      profile_picture_thumb: updatedUser.profile_picture
        ? getFullImageUrl(updatedUser.profile_picture)
        : "",
    };

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Profile updated successfully.",
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- PASSWORD RECOVERY ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Email is required.",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Email not found.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: "Password Reset Code",
      html: `<h1>${otp}</h1>`,
    });

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Code sent.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Email, OTP and new password are required.",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail, otp });

    if (!user || !user.otp_expires || new Date() > user.otp_expires) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "Invalid/Expired OTP",
      });
    }

    user.password = new_password;
    user.otp = null;
    user.otp_expires = null;
    await user.save();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Password updated!",
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

// --- ADMIN CRUD OPS ---
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ created_at: -1 })
      .select("-password");

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "User Updated!",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: "User Deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

// --- SQL DATA FETCHING ---
exports.getAllRituals = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM rituals WHERE status = 'active' OR status = '1'"
    );
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error: " + error.message,
    });
  }
};

exports.getMembershipPlans = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM membership_cards WHERE status = 'active' OR status = '1'"
    );
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error: " + error.message,
    });
  }
};

exports.getAssistantsByTemple = async (req, res) => {
  try {
    const { templeId } = req.params;
    const [rows] = await db.execute(
      "SELECT * FROM temple_assistants WHERE temple_id = ?",
      [templeId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error: " + error.message,
    });
  }
};

exports.bookRitual = async (req, res) =>
  res.status(200).json({ success: true, message: "Booking received!" });

exports.purchaseMembership = async (req, res) =>
  res.status(200).json({ success: true, message: "Purchase successful!" });