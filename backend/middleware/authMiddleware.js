const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 1. Base Protection Middleware
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User no longer exists." });
      }

      // Bypass verification check for Admins (Type 1 & 2)
      const isAdmin = req.user.user_type === 1 || req.user.user_type === 2;
      
      if (!isAdmin && !req.user.is_verified) {
        return res.status(401).json({ 
          success: false, 
          message: "Account not verified. Please complete OTP verification.",
          isVerified: false 
        });
      }

      next();
    } catch (error) {
      let message = "Not authorized, token failed";
      if (error.name === "TokenExpiredError") {
        message = "Session expired. Please log in again.";
      }
      return res.status(401).json({ success: false, message });
    }
  } else {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided." });
  }
};

/**
 * 2. Role/UserType Authorization (Flexible)
 */
exports.authorize = (...types) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ success: false, message: "Auth middleware sequence error." });
    }

    if (!types.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied for user type ${req.user.user_type}.`,
      });
    }
    next();
  };
};

/**
 * 3. Specific Admin Protection (Cleanest Production Version)
 * Instead of nesting, we call them sequentially in the route file.
 * But if you want a single wrapper, use this logic:
 */
exports.protectAdmin = [
  exports.protect, // First, verify the token
  (req, res, next) => { // Then, verify the admin status
    if (req.user.user_type !== 1) {
      return res.status(403).json({ success: false, message: "Access denied: Super Admin only" });
    }
    next();
  }
];