const User = require("../models/User");
// Import your Temple/Offer models if you have them
// const Temple = require("../models/Temple"); 

exports.getHomeData = async (req, res) => {
    try {
        // 🎯 For now, we send empty arrays so the app doesn't crash, 
        // or fetch actual data if your models are ready.
        
        return res.status(200).json({
            status: "true",
            success: true,
            message: "success", // Must match Constants.homeSuccessMsg in Flutter
            data: {
                // Ensure IDs are integers for Flutter
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
        res.status(500).json({ status: "false", message: error.message });
    }
};