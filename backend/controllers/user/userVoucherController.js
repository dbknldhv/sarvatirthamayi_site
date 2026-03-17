const Voucher = require("../../models/Voucher");
const { validateVoucher } = require("../../utils/voucherHelper");

/**
 * API: Verify Voucher Code
 * Used by the frontend 'Apply' button to show the discount before payment.
 */
exports.verifyVoucherForUser = async (req, res) => {
    try {
        const { code, amount, serviceType } = req.body;
        const userId = req.user.id; // Injected by protect middleware

        if (!code || !amount || !serviceType) {
            return res.status(400).json({ 
                success: false, 
                message: "Code, amount, and service type are required." 
            });
        }

        // Validate business rules (Expiry, Service Category, One-Time Use)
        const result = await validateVoucher(code, userId, serviceType, amount);

        res.status(200).json({
            success: true,
            message: "Voucher applied successfully!",
            data: {
                discountAmount: result.discountAmount,
                finalAmount: result.finalAmount,
                voucherId: result.voucherId
            }
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * API: Get Available Vouchers for Users
 * Fetches active, non-expired vouchers for specific service types (temple/ritual).
 */
exports.getAvailableVouchers = async (req, res) => {
    try {
        const { type } = req.query; // 'temple' or 'ritual'
        const now = new Date();

        // Query: Active, not expired, and matches the service type
        let query = { 
            status: 1,
            $or: [
                { expiry_date: null },
                { expiry_date: { $gt: now } }
            ]
        };

        // Filter by specific service if requested
        if (type) {
            query[`applies_to.${type}`] = true;
        }

        const vouchers = await Voucher.find(query)
            .select("code title discount_type discount_value description")
            .sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};