const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 1. Base Protection Middleware
 * Optimized to prevent database overhead and ensure sql_id availability
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      /**
       * 🎯 PROD OPTIMIZATION:
       * Instead of fetching the WHOLE user object every single time (slow),
       * we fetch only the ID, sql_id, and user_type. 
       * We use .lean() to make it a plain JS object (faster).
       */
      req.user = await User.findById(decoded.id)
        .select("sql_id user_type role")
        .lean();

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }

      /**
       * 🎯 CAST ERROR PREVENTER:
       * We ensure sql_id is attached to req.user. If it's missing in DB 
       * but present in decoded token, we use the token value as backup.
       */
      req.user.sql_id = req.user.sql_id || decoded.sql_id;

      next();
    } catch (error) {
      console.error("🔥 Auth Middleware Error:", error.message);
      return res.status(401).json({ 
        success: false, 
        message: error.name === "TokenExpiredError" ? "Session expired" : "Not authorized" 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

/**
 * 2. Multi-Role Authorization
 */
exports.authorize = (...types) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    // Convert both to numbers to be safe
    const userType = Number(req.user.user_type);
    if (!types.map(Number).includes(userType)) {
      return res.status(403).json({
        success: false,
        message: `Access denied for user type ${userType}`,
      });
    }
    next();
  };
};

/**
 * 3. Super Admin Only
 */
exports.adminOnly = (req, res, next) => {
  if (req.user && (Number(req.user.user_type) === 1 || req.user.role === "admin")) {
    next();
  } else {
    return res.status(403).json({ success: false, message: "Access denied: Admin only" });
  }
};