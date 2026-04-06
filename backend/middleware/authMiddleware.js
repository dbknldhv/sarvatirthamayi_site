const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect Routes: Verifies JWT and checks if User exists in the DB.
 * Uses 403 for missing users to prevent Flutter "Token Expired" crashes.
 */
exports.protect = async (req, res, next) => {
  let token;

  // 1. Extract Token from Header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // 2. Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. 🎯 THE REDIRECT TRIGGER: Check if user exists in the new DB
      const user = await User.findById(decoded.id)
        .select("_id sql_id user_type role first_name email")
        .lean();

      if (!user) {
        /**
         * 🎯 USE 403 HERE: 
         * Your Flutter 'buildHttpResponse' has a 'throw' specifically for 401.
         * By sending 403, 'buildHttpResponse' returns normally, and 
         * 'handleResponse' will show the toast message instead of crashing.
         */
        return res.status(403).json({
          status: "false",
          success: false,
          message: "Account not found. Please Sign Up again.",
        });
      }

      // 4. Handle Legacy SQL_ID (Compatibility for your Flutter models)
      const dbSqlId = user.sql_id ? Number(user.sql_id) : NaN;
      const tokenSqlId = decoded.sql_id ? Number(decoded.sql_id) : NaN;

      let finalSqlId = 0;
      if (!Number.isNaN(dbSqlId) && dbSqlId > 0) {
        finalSqlId = dbSqlId;
      } else if (!Number.isNaN(tokenSqlId) && tokenSqlId > 0) {
        finalSqlId = tokenSqlId;
      }

      // 5. Attach formatted user object to request
      req.user = {
        ...user,
        _id: String(user._id),
        id: String(user._id),
        sql_id: finalSqlId,
      };

      return next();

    } catch (error) {
      console.error("🔥 Auth Middleware Error:", error.message);

      /**
       * 🎯 USE 401 HERE:
       * For actual Token failures (Expired or Invalid), we keep 401.
       * This allows the app to clear the stored token eventually.
       */
      let message = "Session expired. Please login again.";
      if (error.name === "JsonWebTokenError") {
        message = "Invalid token. Please login again.";
      }

      return res.status(401).json({
        status: "false",
        success: false,
        message: message,
      });
    }
  }

  // No token found
  return res.status(401).json({
    status: "false",
    success: false,
    message: "Not authorized, no token found.",
  });
};

/**
 * Multi-role authorization
 */
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

/**
 * Admin Only Access
 */
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