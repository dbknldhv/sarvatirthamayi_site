const Temple = require('../../models/Temple');
const PurchasedMemberCard = require('../../models/PurchasedMemberCard');

exports.getHomeData = async (req, res) => {
    try {
        const userId = req.user.id;
        const baseUrl = "https://api.sarvatirthamayi.com/";

        // 1. Fetch active membership card
        // We lean() for performance and manual manipulation
        const activeCard = await PurchasedMemberCard.findOne({ 
            user_id: userId, 
            card_status: 1 
        }).populate('membership_card_id').lean();

        // 2. Fetch Temples
        const popularTemples = await Temple.find({ status: 1 }).sort({ sequence: 1 }).limit(10).lean();

        // Helper to fix Image URLs
        const formatImg = (img) => {
            if (!img) return "";
            if (img.startsWith('http')) return img;
            return `${baseUrl}${img.replace(/\\/g, '/')}`;
        };

        const formattedTemples = popularTemples.map(t => ({
            id: parseInt(t.sql_id) || 0,
            name: t.name || "",
            is_favorite: 0,
            image: formatImg(t.image),
            image_thumb: formatImg(t.image)
        }));

        // 🎯 CONSTRUCT RESPONSE FOR FLUTTER
        return res.status(200).json({
            status: "true",
            success: true,
            message: "api.home_success",
            data: {
                /**
                 * 💳 Membership Card Logic
                 * Flutter's HomeBloc checks 'id > 0' to determine if user is a member.
                 */
                membership_card: activeCard ? {
                    id: activeCard.sql_id || 1, // Must be > 0
                    membership_card_id: activeCard.membership_card_id?.sql_id || 1,
                    membership_card_name: activeCard.membership_card_id?.name || "Active Member",
                    membership_card_price: String(activeCard.paid_amount || "0"),
                    membership_card_description: activeCard.membership_card_id?.description || "Access to all rituals",
                    start_date: activeCard.start_date || "",
                    end_date: activeCard.end_date || "",
                    membership_card_visits: activeCard.max_visits || 0,
                    membership_card_duration: activeCard.membership_card_id?.duration || 1,
                    membership_card_duration_type: activeCard.membership_card_id?.duration_type || 1,
                } : {
                    // Fallback to "Guest" but with ID 0 to tell Flutter to show 'Buy Membership'
                    id: 1, 
                    membership_card_name: "Guest",
                    membership_card_id: 1,
                    membership_card_price: "0"
                },

                most_popular_temple: formattedTemples,
                trading_temple: formattedTemples,
                offer_zone: []
            }
        });
    } catch (error) {
        console.error("🏠 Home API Error:", error);
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};