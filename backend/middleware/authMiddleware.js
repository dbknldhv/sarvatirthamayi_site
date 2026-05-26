const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1. Bearer token support - Flutter/mobile
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. Cookie token support - React admin web
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Not authorized, no token found.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("_id sql_id user_type role first_name email")
      .lean();

    if (!user) {
      return res.status(403).json({
        status: "false",
        success: false,
        message: "Account not found. Please Sign Up again.",
      });
    }

    const dbSqlId = user.sql_id ? Number(user.sql_id) : NaN;
    const tokenSqlId = decoded.sql_id ? Number(decoded.sql_id) : NaN;

    let finalSqlId = 0;
    if (!Number.isNaN(dbSqlId) && dbSqlId > 0) {
      finalSqlId = dbSqlId;
    } else if (!Number.isNaN(tokenSqlId) && tokenSqlId > 0) {
      finalSqlId = tokenSqlId;
    }

    req.user = {
      ...user,
      _id: String(user._id),
      id: String(user._id),
      sql_id: finalSqlId,
    };

    return next();
  } catch (error) {
    console.error("🔥 Auth Middleware Error:", error.message);

    let message = "Session expired. Please login again.";
    if (error.name === "JsonWebTokenError") {
      message = "Invalid token. Please login again.";
    }

    return res.status(401).json({
      status: "false",
      success: false,
      message,
    });
  }
};

exports.authorize = (...types) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "false",
        success: false,
        message: "Unauthorized",
      });
    }

    const currentUserType = Number(req.user.user_type);
    const allowedTypes = types.map(Number);

    if (!allowedTypes.includes(currentUserType)) {
      return res.status(403).json({
        status: "false",
        success: false,
        message: `Forbidden: Access denied for user type ${currentUserType}`,
      });
    }

    next();
  };
};

exports.adminOnly = (req, res, next) => {
  if (
    req.user &&
    (Number(req.user.user_type) === 1 || req.user.role === "admin")
  ) {
    return next();
  }

  return res.status(403).json({
    status: "false",
    success: false,
    message: "Access denied: Admin only",
  });
};