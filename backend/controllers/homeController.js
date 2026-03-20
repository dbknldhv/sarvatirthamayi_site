const User = require("../models/User");

exports.getHomeData = async (req, res) => {
    try {
        return res.status(200).json({
            status: "true",
            success: true,
            // 🛑 CRITICAL: This must match Constants.homeSuccessMsg in strings.dart
            message: "api.home_success", 
            data: {
                mostPopularTemple: [], 
                tradingTemple: [],
                offerZone: [],
                membershipCard: {
                    id: 1,
                    name: "Basic Membership"
                }
            }
        });
    } catch (error) {
        console.error("Home Data Error:", error);
        res.status(500).json({ status: "false", message: error.message });
    }
};