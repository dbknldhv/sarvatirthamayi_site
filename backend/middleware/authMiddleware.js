const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 1. Base Protection Middleware
 * Verifies JWT and attaches the user to req.user
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request (excluding password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }

      next();
    } catch (error) {
      console.error("🔥 Auth Middleware Error:", error.message);
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

/**
 * 2. Multi-Role Authorization
 * Usage: router.get('/admin-route', protect, authorize(1, 2))
 */
exports.authorize = (...types) => {
  return (req, res, next) => {
    // Safety check if user isn't attached
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (!types.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied for user type ${req.user.user_type}`,
      });
    }
    next();
  };
};

/**
 * 3. Super Admin Only (Simplified)
 * Usage: router.get('/super-secret', protect, adminOnly)
 */
exports.adminOnly = (req, res, next) => {
  if (req.user && (req.user.user_type === 1 || req.user.role === "admin")) {
    next();
  } else {
    return res.status(403).json({ success: false, message: "Access denied: Super Admin only" });
  }
};