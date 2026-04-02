// controllers/user/offerController.js
const Offer = require("../../models/Offer");
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

    const formattedOffers = offers.map((item) => ({
      id: item.sql_id || 0,
      temple_id: item.temple_id || 0,
      name: item.name || "",
      description: item.description || "",
      discount_percentage: item.discount_percentage ?? null,
      discount_amount: item.discount_amount ?? null,
      type: item.type || 0,
      reference_id: item.reference_id || 0,
      status: item.status || 0,
      sequence: item.sequence || 0,
      is_favorite: 0,
      image: formatImageUrl(item.image),
    }));

    const totalPages = Math.ceil(totalCount / perPage);
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
        next_page_url: isNext ? `/api/user/offers?page=${page + 1}&per_page=${perPage}` : null,
        prev_page_url: isPrev ? `/api/user/offers?page=${page - 1}&per_page=${perPage}` : null,
        path: "/api/user/offers",
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

    return res.status(200).json({
      status: "true",
      message: "Offer fetched successfully",
      data: {
        id: offer.sql_id || 0,
        temple_id: offer.temple_id || 0,
        name: offer.name || "",
        description: offer.description || "",
        discount_percentage: offer.discount_percentage ?? null,
        discount_amount: offer.discount_amount ?? null,
        type: offer.type || 0,
        reference_id: offer.reference_id || 0,
        status: offer.status || 0,
        sequence: offer.sequence || 0,
        is_favorite: 0,
        image: formatImageUrl(offer.image),
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