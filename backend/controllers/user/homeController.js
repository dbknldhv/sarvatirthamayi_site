const Temple = require("../../models/Temple");
const PurchasedMemberCard = require("../../models/PurchasedMemberCard");
const Offer = require("../../models/Offer");
const formatImageUrl = require("../../utils/imageUrl");

exports.getHomeData = async (req, res) => {
  try {
    const userId = req.user.id;

    const activeCard = await PurchasedMemberCard.findOne({
      user_id: userId,
      card_status: 1,
    })
      .populate("membership_card_id")
      .lean();

    const popularTemples = await Temple.find({ status: 1 })
      .sort({ sequence: 1 })
      .limit(10)
      .lean();

    const formattedTemples = popularTemples.map((t) => ({
      id: parseInt(t.sql_id) || 0,
      name: t.name || "",
      is_favorite: 0,
      image: formatImageUrl(t.image),
      image_thumb: formatImageUrl(t.image),
    }));

    // ===== Fetch Offer Zone Data =====
    const offers = await Offer.find({ status: 1 })
      .sort({ sequence: 1 })
      .limit(5)
      .lean();

    const formattedOffers = offers.map((o) => ({
      id: parseInt(o.sql_id) || 0,
      temple_id: o.temple_id || 0,
      name: o.name || "",
      description: o.description || "",
      discount_percentage: o.discount_percentage || 0,
      discount_amount: o.discount_amount || null,
      type: o.type || 0,
      reference_id: o.reference_id || 0,
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