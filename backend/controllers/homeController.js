const Temple = require('../models/Temple');
const PurchasedMemberCard = require('../models/PurchasedMemberCard');

/**
 * GET /api/v1/home
 * Fetches dashboard data: Active User Membership and Temple Lists
 * Matches Flutter HomeModel (get_home_model.dart)
 */
exports.getHomeData = async (req, res) => {
    try {
        // req.user.id is populated by the 'protect' middleware
        const userId = req.user.id;

        // 1. Fetch Sam's active membership card from the 'purchasedmembercards' collection
        // We populate 'membership_card_id' to get details like name and duration from the 'Membership' model
        const activeCard = await PurchasedMemberCard.findOne({ 
            user_id: userId, 
            card_status: 1 
        }).populate('membership_card_id').lean();

        // 2. Fetch Most Popular Temples (Sorted by sequence)
        const popularTemples = await Temple.find({ status: 1 })
            .sort({ sequence: 1 })
            .limit(10)
            .lean();

        // 3. Fetch Trading Temples (Sorted by trading_sequence)
        const tradingTemples = await Temple.find({ status: 1 })
            .sort({ trading_sequence: 1 })
            .limit(10)
            .lean();

        // 4. Construct response to exactly match Flutter's expectations
        return res.status(200).json({
            status: "true",
            success: true,
            message: "api.home_success",
            data: {
                /**
                 * 🎯 Membership Card Object
                 * If Sam has no card, we provide a default "Guest" structure 
                 * to prevent 'Null check operator' crashes in Flutter.
                 */
                membership_card: activeCard ? {
                    id: activeCard.sql_id || 1,
                    start_date: activeCard.start_date,
                    end_date: activeCard.end_date,

                    membership_card_id: activeCard.sql_id || 0,

                    membership_card_name: activeCard.membership_card_id?.name || "Member",
                    membership_card_description: activeCard.membership_card_id?.description || "Active Club Member",
                    membership_card_visits: activeCard.max_visits || 0,
                    membership_card_price: String(activeCard.paid_amount || 0),
                    membership_card_duration_type: activeCard.membership_card_id?.duration_type || 1,
                    membership_card_duration: activeCard.membership_card_id?.duration || 1
                } : {
                    // Fallback to prevent line 37 crash in HomeBloc
                    id: 0,
                    membership_card_name: "Guest",
                    membership_card_id: 0,
                    membership_card_price: "0"
                },

                // Mapping temples to the 'Temple' class in Dart
                most_popular_temple: popularTemples.map(t => ({
                    id: t.sql_id || 0,
                    name: t.name || "",
                    is_favorite: 0,
                    image: t.image || "",
                    image_thumb: t.image || ""
                })),

                trading_temple: tradingTemples.map(t => ({
                    id: t.sql_id || 0,
                    name: t.name || "",
                    is_favorite: 0,
                    image: t.image || "",
                    image_thumb: t.image || ""
                })),

                // Placeholder for future Offer/Voucher features
                offer_zone: []
            }
        });
    } catch (error) {
        console.error("Home API Error:", error);
        res.status(500).json({ 
            status: "false", 
            success: false, 
            message: error.message 
        });
    }
};