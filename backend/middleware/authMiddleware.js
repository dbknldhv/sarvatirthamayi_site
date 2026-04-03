const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 🔒 PRODUCTION AUTH MIDDLEWARE
 * This version is designed to prevent "Cast to Number" crashes.
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      
      // 1. Decode the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 2. Fetch only required fields from DB (Faster)
      // We use .lean() to get a plain JSON object
      const user = await User.findById(decoded.id)
        .select("sql_id user_type role")
        .lean();

      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }

      // 3. 🎯 THE CRITICAL FIX:
      // We attach the user to req.user. 
      // We MUST ensure sql_id is a Number. 
      // If it's missing in DB, we try to get it from the token payload.
      req.user = {
        ...user,
        id: user._id.toString(), // The string ID for lookups
        sql_id: Number(user.sql_id || decoded.sql_id || 0) // THE NUMERIC ID
      };

      // Final Check: If sql_id is still NaN or 0, we have a problem with the account
      if (!req.user.sql_id || isNaN(req.user.sql_id)) {
          console.error("🛑 Auth Warning: User has no numeric sql_id. Token ID:", decoded.id);
      }

      next();
    } catch (error) {
      console.error("🔥 Auth Middleware Error:", error.message);
      const msg = error.name === "TokenExpiredError" ? "Session expired" : "Not authorized";
      return res.status(401).json({ success: false, message: msg });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
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