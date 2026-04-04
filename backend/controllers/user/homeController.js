const Temple = require("../../models/Temple");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");
const Offer = require("../../models/Offer");
const Favorite = require("../../models/Favorite");
const User = require("../../models/User");
const formatImageUrl = require("../../utils/imageUrl");

/* ---------------------------------------------------
   HELPERS (STRICT TYPE CASTING)
   --------------------------------------------------- */
const toInt = (val) => {
    const n = parseInt(val);
    return isNaN(n) ? 0 : n;
};

const toString = (val) => (val ? String(val) : "");

const getAuthUserObjectId = (req) => {
    return req.user?._id || req.user?.id || null;
};

const getAuthUserSqlId = async (req) => {
    if (req.user?.sql_id) return Number(req.user.sql_id);
    const authUserId = getAuthUserObjectId(req);
    if (!authUserId) return 0;

    const user = await User.findById(authUserId).select("sql_id").lean();
    return Number(user?.sql_id || 0);
};

/* ---------------------------------------------------
   MAIN CONTROLLER
   --------------------------------------------------- */
exports.getHomeData = async (req, res) => {
    try {
        const authUserObjectId = getAuthUserObjectId(req);
        const authUserSqlId = await getAuthUserSqlId(req);

        // 1. Fetch Active Membership
        const activeCard = authUserObjectId
            ? await PurchasedMemberCard.findOne({
                user_id: authUserObjectId,
                card_status: 1,
                payment_status: 2 // Only show paid cards
            })
                .populate("membership_card_id")
                .lean()
            : null;

        // 2. Fetch Temples and Offers
        const [popularTemples, offers] = await Promise.all([
            Temple.find({ status: 1 }).sort({ sequence: 1 }).limit(10).lean(),
            Offer.find({ status: 1 }).sort({ sequence: 1 }).limit(5).lean()
        ]);

        // 3. Handle Favorites Logic
        const templeReferenceIds = popularTemples.map((t) => Number(t.sql_id)).filter(Boolean);
        const offerReferenceIds = offers.map((o) => Number(o.reference_id)).filter(Boolean);

        const favoriteDocs = (authUserSqlId > 0)
            ? await Favorite.find({
                user_id: authUserSqlId,
                $or: [
                    { type: 1, reference_id: { $in: templeReferenceIds } },
                    { type: 6, reference_id: { $in: offerReferenceIds } },
                ],
            }).lean()
            : [];

        const favoriteTempleSet = new Set(favoriteDocs.filter(f => Number(f.type) === 1).map(f => Number(f.reference_id)));
        const favoriteOfferSet = new Set(favoriteDocs.filter(f => Number(f.type) === 6).map(f => Number(f.reference_id)));

        // 4. Format Temples
        const formattedTemples = popularTemples.map((t) => ({
            id: toInt(t.sql_id),
            name: toString(t.name),
            is_favorite: favoriteTempleSet.has(Number(t.sql_id)) ? 1 : 0,
            image: formatImageUrl(t.image),
            image_thumb: formatImageUrl(t.image),
        }));

        // 5. Format Offers
        const formattedOffers = offers.map((o) => ({
            id: toInt(o.sql_id),
            temple_id: toInt(o.temple_id),
            name: toString(o.name),
            description: toString(o.description),
            discount_percentage: Number(o.discount_percentage || 0),
            discount_amount: toString(o.discount_amount ?? (o.discount_percentage || 0)),
            type: toInt(o.type),
            reference_id: toInt(o.reference_id),
            is_favorite: favoriteOfferSet.has(Number(o.reference_id)) ? 1 : 0,
            image: formatImageUrl(o.image),
            image_thumb: formatImageUrl(o.image),
        }));

        // 6. Final Membership Data Object
        const membershipCardData = activeCard ? {
            // 🎯 CRITICAL: Use toInt to ensure Flutter doesn't get a String ID
            id: toInt(activeCard.sql_id) || 1,
            membership_card_id: toInt(activeCard.membership_card_id?.sql_id) || 1,
            membership_card_name: toString(activeCard.membership_card_id?.name || "Active Member"),
            membership_card_price: toString(activeCard.paid_amount || "0"),
            membership_card_description: toString(activeCard.membership_card_id?.description || "Access to all rituals"),
            start_date: toString(activeCard.start_date),
            end_date: toString(activeCard.end_date),
            membership_card_visits: toInt(activeCard.max_visits),
            membership_card_duration: toInt(activeCard.membership_card_id?.duration || 1),
            membership_card_duration_type: toInt(activeCard.membership_card_id?.duration_type || 1),
        } : {
            // 🎯 Guest Fallback (Always Int)
            id: 1,
            membership_card_name: "Guest",
            membership_card_id: 1,
            membership_card_price: "0",
        };

        return res.status(200).json({
            status: "true",
            success: true,
            message: "api.home_success",
            data: {
                membership_card: membershipCardData,
                most_popular_temple: formattedTemples,
                trading_temple: formattedTemples,
                offer_zone: formattedOffers,
            },
        });
    } catch (error) {
        console.error("🏠 Home API Error:", error.message);
        return res.status(500).json({ status: "false", success: false, message: "Internal Server Error" });
    }
};