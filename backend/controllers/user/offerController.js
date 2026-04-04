// controllers/user/offerController.js
const Offer = require("../../models/Offer");
const Favorite = require("../../models/Favorite");
const formatImageUrl = require("../../utils/imageUrl");

const getOffers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || req.body.page || 1, 10), 1);
    const perPage = Math.max(parseInt(req.query.per_page || req.body.per_page || 10, 10), 1);

    const skip = (page - 1) * perPage;
    const query = { status: 1 };

    const totalCount = await Offer.countDocuments(query);

    const offers = await Offer.find(query)
      .sort({ sequence: 1, created_at: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const userSqlId = Number(req.user?.sql_id || 0);
    let favoriteSet = new Set();

    if (userSqlId > 0 && offers.length > 0) {
      const referenceIds = offers
        .map((item) => Number(item.reference_id))
        .filter(Boolean);

      const favoriteDocs = await Favorite.find({
        user_id: userSqlId,
        type: 6,
        reference_id: { $in: referenceIds },
        status: 1,
      }).lean();

      favoriteSet = new Set(
        favoriteDocs.map((fav) => Number(fav.reference_id))
      );
    }

    const formattedOffers = offers.map((o) => ({
      id: parseInt(o.sql_id) || 0,
      temple_id: Number(o.temple_id || 0),
      name: o.name || "",
      description: o.description || "",
      discount_percentage: Number(o.discount_percentage ?? 0),
      discount_amount:
        o.discount_amount != null
          ? Number(o.discount_amount)
          : Number(o.discount_percentage ?? 0),
      type: Number(o.type || 0),
      reference_id: Number(o.reference_id || 0),
      status: Number(o.status || 0),
      sequence: Number(o.sequence || 0),
      is_favorite: favoriteSet.has(Number(o.reference_id)) ? 1 : 0,
      image: formatImageUrl(o.image),
      image_thumb: formatImageUrl(o.image),
    }));

    const totalPages = totalCount > 0 ? Math.ceil(totalCount / perPage) : 1;
    const isNext = page < totalPages;
    const isPrev = page > 1;

    return res.status(200).json({
      status: "true",
      message: "Offer list fetched successfully",
      data: {
        data: formattedOffers,
        total_count: totalCount,
        is_next: isNext,
        is_prev: isPrev,
        total_pages: totalPages,
        current_page: page,
        per_page: perPage,
        from: totalCount === 0 ? 0 : skip + 1,
        to: skip + formattedOffers.length,
        next_page_url: isNext
          ? `/api/v1/offers?page=${page + 1}&per_page=${perPage}`
          : null,
        prev_page_url: isPrev
          ? `/api/v1/offers?page=${page - 1}&per_page=${perPage}`
          : null,
        path: "/api/v1/offers",
        has_pages: totalPages > 1,
        links: [],
      },
    });
  } catch (error) {
    console.error("getOffers error:", error);
    return res.status(500).json({
      status: "false",
      message: "Failed to fetch offers",
      error: error.message,
    });
  }
};

const getOfferById = async (req, res) => {
  try {
    const id = req.body.id || req.params.id;

    if (!id) {
      return res.status(400).json({
        status: "false",
        message: "Offer id is required",
      });
    }

    const offer = await Offer.findOne({
      $or: [{ sql_id: Number(id) }, { _id: id }],
      status: 1,
    }).lean();

    if (!offer) {
      return res.status(404).json({
        status: "false",
        message: "Offer not found",
      });
    }

    const userSqlId = Number(req.user?.sql_id || 0);
    let isFavorite = 0;

    if (userSqlId > 0) {
      const favoriteExists = await Favorite.exists({
        user_id: userSqlId,
        type: 6,
        reference_id: Number(offer.reference_id),
        status: 1,
      });

      isFavorite = favoriteExists ? 1 : 0;
    }

    return res.status(200).json({
      status: "true",
      message: "Offer fetched successfully",
      data: {
        id: Number(offer.sql_id || 0),
        temple_id: Number(offer.temple_id || 0),
        name: offer.name || "",
        description: offer.description || "",
        discount_percentage: Number(offer.discount_percentage ?? 0),
        discount_amount:
          offer.discount_amount != null
            ? Number(offer.discount_amount)
            : Number(offer.discount_percentage ?? 0),
        type: Number(offer.type || 0),
        reference_id: Number(offer.reference_id || 0),
        status: Number(offer.status || 0),
        sequence: Number(offer.sequence || 0),
        is_favorite: isFavorite,
        image: formatImageUrl(offer.image),
        image_thumb: formatImageUrl(offer.image),
      },
    });
  } catch (error) {
    console.error("getOfferById error:", error);
    return res.status(500).json({
      status: "false",
      message: "Failed to fetch offer",
      error: error.message,
    });
  }
};

module.exports = {
  getOffers,
  getOfferById,
};