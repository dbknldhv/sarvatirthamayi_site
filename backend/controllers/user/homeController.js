const Temple = require("../../models/Temple");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");
const Offer = require("../../models/Offer");
const Favorite = require("../../models/Favorite");
const User = require("../../models/User");
const formatImageUrl = require("../../utils/imageUrl");

const getAuthUserObjectId = (req) => {
  return req.user?._id || req.user?.id || null;
};

const getAuthUserSqlId = async (req) => {
  if (req.user?.sql_id) return Number(req.user.sql_id);
  if (req.user?.user_id && !isNaN(Number(req.user.user_id))) {
    return Number(req.user.user_id);
  }

  const authUserId = getAuthUserObjectId(req);
  if (!authUserId) return 0;

  const user = await User.findById(authUserId).select("sql_id").lean();
  return Number(user?.sql_id || 0);
};

exports.getHomeData = async (req, res) => {
  try {
    const authUserObjectId = getAuthUserObjectId(req);
    const authUserSqlId = await getAuthUserSqlId(req);

    const activeCard = authUserObjectId
      ? await PurchasedMemberCard.findOne({
          user_id: authUserObjectId,
          card_status: 1,
        })
          .populate("membership_card_id")
          .lean()
      : null;

    const popularTemples = await Temple.find({ status: 1 })
      .sort({ sequence: 1 })
      .limit(10)
      .lean();

    const offers = await Offer.find({ status: 1 })
      .sort({ sequence: 1 })
      .limit(5)
      .lean();

    const templeReferenceIds = popularTemples
      .map((t) => Number(t.sql_id))
      .filter(Boolean);

    const offerReferenceIds = offers
      .map((o) => Number(o.reference_id))
      .filter(Boolean);

    const favoriteDocs = authUserSqlId
      ? await Favorite.find({
          user_id: authUserSqlId,
          $or: [
            { type: 1, reference_id: { $in: templeReferenceIds } },
            { type: 6, reference_id: { $in: offerReferenceIds } },
          ],
        }).lean()
      : [];

    const favoriteTempleSet = new Set(
      favoriteDocs
        .filter((f) => Number(f.type) === 1)
        .map((f) => Number(f.reference_id))
    );

    const favoriteOfferSet = new Set(
      favoriteDocs
        .filter((f) => Number(f.type) === 6)
        .map((f) => Number(f.reference_id))
    );

    const formattedTemples = popularTemples.map((t) => ({
      id: parseInt(t.sql_id) || 0,
      name: t.name || "",
      is_favorite: favoriteTempleSet.has(Number(t.sql_id)) ? 1 : 0,
      image: formatImageUrl(t.image),
      image_thumb: formatImageUrl(t.image),
    }));

    const formattedOffers = offers.map((o) => ({
      id: parseInt(o.sql_id) || 0,
      temple_id: Number(o.temple_id) || 0,
      name: o.name || "",
      description: o.description || "",
      discount_percentage: Number(o.discount_percentage ?? 0),
      discount_amount: String(
        o.discount_amount != null
          ? o.discount_amount
          : (o.discount_percentage ?? 0)
      ),
      type: Number(o.type) || 0,
      reference_id: Number(o.reference_id) || 0,
      is_favorite: favoriteOfferSet.has(Number(o.reference_id)) ? 1 : 0,
      image: formatImageUrl(o.image),
      image_thumb: formatImageUrl(o.image),
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "api.home_success",
      data: {
        membership_card: activeCard
          ? {
              id: activeCard.sql_id || 1,
              membership_card_id: activeCard.membership_card_id?.sql_id || 1,
              membership_card_name:
                activeCard.membership_card_id?.name || "Active Member",
              membership_card_price: String(activeCard.paid_amount || "0"),
              membership_card_description:
                activeCard.membership_card_id?.description ||
                "Access to all rituals",
              start_date: activeCard.start_date || "",
              end_date: activeCard.end_date || "",
              membership_card_visits: activeCard.max_visits || 0,
              membership_card_duration:
                activeCard.membership_card_id?.duration || 1,
              membership_card_duration_type:
                activeCard.membership_card_id?.duration_type || 1,
            }
          : {
              id: 1,
              membership_card_name: "Guest",
              membership_card_id: 1,
              membership_card_price: "0",
            },

        most_popular_temple: formattedTemples,
        trading_temple: formattedTemples,
        offer_zone: formattedOffers,
      },
    });
  } catch (error) {
    console.error("🏠 Home API Error:", error);
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};