const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect Routes: Verifies JWT and checks if User exists in the DB.
 * Uses HTTP 403 for missing users to prevent Flutter "Token Expired" crashes.
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

      // 3. 🎯 THE FIX: Fetch user and handle "User Not Found"
      const user = await User.findById(decoded.id)
        .select("_id sql_id user_type role first_name email")
        .lean();

      if (!user) {
        /**
         * 🎯 CRITICAL CHANGE: Returning 403 instead of 401.
         * Your Flutter 'buildHttpResponse' throws an exception on 401.
         * By sending 403, 'handleResponse' will show the toast without crashing.
         */
        return res.status(401).json({
          status: "false",
          success: false,
          message: "Account not found. Please Sign Up again.",
        });
      }

      // 4. Handle Legacy SQL_ID (Compatibility for Flutter models)
      const dbSqlId =
        user.sql_id !== undefined && user.sql_id !== null
          ? Number(user.sql_id)
          : NaN;

      const tokenSqlId =
        decoded.sql_id !== undefined && decoded.sql_id !== null
          ? Number(decoded.sql_id)
          : NaN;

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

      if (req.user.sql_id === 0) {
        console.warn(`⚠️ Warning: User ${decoded.id} has no valid sql_id.`);
      }

      return next();
    } catch (error) {
      console.error("🔥 Auth Middleware Error:", error.message);

      let message = "Not authorized, token failed";
      if (error.name === "TokenExpiredError") {
        message = "Session expired. Please login again.";
      } else if (error.name === "JsonWebTokenError") {
        message = "Invalid token. Please login again.";
      }

      // Keep 401 for actual token failures to trigger standard logout logic
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
 * Usage: router.get('/path', protect, authorize(1, 2))
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