const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * FINAL AUTH MIDDLEWARE
 * Handles:
 * - JWT verification
 * - Mongo user id
 * - numeric sql_id fallback
 * - old tokens safely
 */
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id)
        .select("_id sql_id user_type role first_name email")
        .lean();

      if (!user) {
        return res.status(401).json({
          status: "false",
          success: false,
          message: "User account no longer exists.",
        });
      }

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

      req.user = {
        ...user,
        _id: String(user._id),
        id: String(user._id),
        sql_id: finalSqlId,
      };

      if (req.user.sql_id === 0) {
        console.warn(
          `⚠️ Warning: User ${decoded.id} has no valid sql_id. Some legacy numeric relations may fail until corrected in DB.`
        );
      }

      return next();
    } catch (error) {
      console.error("🔥 Auth Error:", error.message);

      let message = "Not authorized, token failed";
      if (error.name === "TokenExpiredError") {
        message = "Session expired. Please login again.";
      } else if (error.name === "JsonWebTokenError") {
        message = "Invalid token. Please login again.";
      }

      return res.status(401).json({
        status: "false",
        success: false,
        message,
      });
    }
  }

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
 * Admin only
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