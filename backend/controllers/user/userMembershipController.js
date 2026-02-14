const Membership = require("../../models/Membership");

/**
 * Fetch active membership plans for the "Join Now" page
 * This ensures the frontend always gets { success: true, data: [...] }
 */
exports.getAvailablePlans = async (req, res) => {
    try {
        // We only want 'Active' plans (status: 1)
        const plans = await Membership.find({ status: 1 })
            .sort({ price: 1 })
            .populate("temples.templeId", "name");

        res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        console.error("Error in getAvailablePlans:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load membership plans",
            error: error.message
        });
    }
};