const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 🔒 FINAL PRODUCTION AUTH MIDDLEWARE
 * Solves: "Cast to Number" crashes, Old Tokens, and Missing DB fields.
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Check for Bearer Token
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];

            // 2. Verify Token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Fetch user from DB using the String ID (Lean for speed)
            const user = await User.findById(decoded.id)
                .select("sql_id user_type role first_name email")
                .lean();

            if (!user) {
                return res.status(401).json({ 
                    status: "false", 
                    success: false, 
                    message: "User account no longer exists." 
                });
            }

            /**
             * 🎯 THE MENTAL PEACE FIX:
             * We force the sql_id to be a Number.
             * Order of priority: 
             * a) User record in DB (as number)
             * b) Decoded Token payload (as number)
             * c) 0 (as a safe fallback to prevent NaN crashes)
             */
            const finalSqlId = Number(user.sql_id || decoded.sql_id || 0);

            // 4. Attach Clean Object to Request
            req.user = {
                ...user,
                _id: user._id.toString(), // Ensure MongoDB ID is a string
                id: user._id.toString(),  // Alias for compatibility
                sql_id: isNaN(finalSqlId) ? 0 : finalSqlId, // GUARANTEED NUMBER
            };

            // 5. Final validation - If it's still 0, log it but don't crash
            if (req.user.sql_id === 0) {
                console.warn(`⚠️ Warning: User ${decoded.id} has no numeric ID. Please re-login.`);
            }

            return next();

        } catch (error) {
            console.error("🔥 Auth Error:", error.message);
            
            // Handle specific JWT errors
            let message = "Not authorized, token failed";
            if (error.name === "TokenExpiredError") message = "Session expired. Please login again.";
            if (error.name === "JsonWebTokenError") message = "Invalid token. Please login again.";

            return res.status(401).json({ status: "false", success: false, message });
        }
    }

    // 6. No Token provided
    if (!token) {
        return res.status(401).json({ 
            status: "false", 
            success: false, 
            message: "Not authorized, no token found." 
        });
    }
};

/**
 * 2. Multi-Role Authorization
 * Usage: router.get('/path', protect, authorize(1, 2))
 */
exports.authorize = (...types) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

        // Force numeric comparison
        const currentUserType = Number(req.user.user_type);
        const allowedTypes = types.map(Number);

        if (!allowedTypes.includes(currentUserType)) {
            return res.status(403).json({
                status: "false",
                success: false,
                message: `Forbidden: Access denied for user type ${currentUserType}`
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