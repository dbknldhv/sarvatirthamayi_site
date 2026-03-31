const Temple = require('../../models/Temple');
const PurchasedMemberCard = require('../../models/PurchasedMemberCard');

exports.getHomeData = async (req, res) => {
    try {
        const userId = req.user.id;
        const baseUrl = "https://api.sarvatirthamayi.com/";

        // 1. Fetch Sam's active membership
        const activeCard = await PurchasedMemberCard.findOne({ 
            user_id: userId, 
            card_status: 1 
        }).populate('membership_card_id').lean();

        // 2. Fetch Temples
        const popularTemples = await Temple.find({ status: 1 }).sort({ sequence: 1 }).limit(10).lean();

        const formatImg = (img) => {
            if (!img) return "";
            if (img.startsWith('http')) return img;
            return `${baseUrl}${img.replace(/\\/g, '/')}`;
        };

        return res.status(200).json({
            status: "true",
            success: true,
            message: "api.home_success",
            data: {
                /**
                 * 🎯 Matches member_ship_purchase_card_model.dart
                 * Flutter checks if membership_card is null or has an ID
                 */
                membership_card: activeCard ? {
                    id: activeCard.sql_id || 1,
                    user_id: 0, // Flutter expects int
                    membership_card_id: activeCard.membership_card_id?.sql_id || 0,
                    card_status: activeCard.card_status || 1,
                    card_status_str: "Active",
                    start_date: activeCard.start_date,
                    end_date: activeCard.end_date,
                    membership_card_name: activeCard.membership_card_id?.name || "Member",
                    membership_card_price: String(activeCard.paid_amount || 0),
                    paid_amount: String(activeCard.paid_amount || 0)
                } : {
                    // Default Guest structure to prevent 'Null check' crash
                    id: 0,
                    membership_card_name: "Guest",
                    membership_card_id: 0,
                    membership_card_price: "0"
                },

                most_popular_temple: popularTemples.map(t => ({
                    id: t.sql_id || 0,
                    name: t.name || "",
                    is_favorite: 0,
                    image: formatImg(t.image),
                    image_thumb: formatImg(t.image)
                })),
                trading_temple: popularTemples.map(t => ({
                    id: t.sql_id || 0,
                    name: t.name || "",
                    is_favorite: 0,
                    image: formatImg(t.image),
                    image_thumb: formatImg(t.image)
                })),
                offer_zone: []
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};