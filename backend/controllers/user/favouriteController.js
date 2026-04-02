const Favorite = require("../../models/Favorite");
const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Offer = require("../../models/Offer");

const TYPE_MAP = {
  1: "Temple",
  2: "Ritual",
  6: "Offer",
};

const getNextSqlId = async () => {
  const lastDoc = await Favorite.findOne().sort({ sql_id: -1 }).lean();
  return (lastDoc?.sql_id || 0) + 1;
};

const getTempleBySqlId = async (sqlId) => {
  return Temple.findOne({ sql_id: Number(sqlId), status: 1 }).lean();
};

const getRitualBySqlId = async (sqlId) => {
  return Ritual.findOne({ sql_id: Number(sqlId), status: 1 })
    .populate("temple_id")
    .lean();
};

const getOfferByReferenceId = async (referenceId) => {
  return Offer.findOne({ reference_id: Number(referenceId), status: 1 }).lean();
};

const resolveFavoriteTarget = async (referenceId, type) => {
  if (type === 1) {
    const temple = await getTempleBySqlId(referenceId);
    if (!temple) return null;

    return {
      reference_id: Number(referenceId),
      temple_id: Number(temple.sql_id) || Number(referenceId),
      type,
      type_str: "Temple",
      name: temple.name || "",
      description: temple.short_description || "",
      image: temple.image || "",
      temple_name: temple.name || "",
    };
  }

  if (type === 2) {
    const ritual = await getRitualBySqlId(referenceId);
    if (!ritual) return null;

    const templeSqlId =
      Number(ritual?.temple_id?.sql_id) ||
      Number(ritual?.temple_id) ||
      null;

    return {
      reference_id: Number(referenceId),
      temple_id: templeSqlId,
      type,
      type_str: "Ritual",
      name: ritual.name || "",
      description: ritual.description || "",
      image: ritual.image || "",
      temple_name: ritual?.temple_id?.name || "",
    };
  }

  if (type === 6) {
    const offer = await getOfferByReferenceId(referenceId);
    if (!offer) return null;

    let templeName = "";
    if (offer.temple_id) {
      const temple = await getTempleBySqlId(offer.temple_id);
      templeName = temple?.name || "";
    }

    return {
      reference_id: Number(referenceId),
      temple_id: Number(offer.temple_id) || null,
      type,
      type_str: "Offer",
      name: offer.name || "",
      description: offer.description || "",
      image: offer.image || "",
      temple_name: templeName,
    };
  }

  return null;
};

exports.favourite = async (req, res) => {
  try {
    const userId = req.user?._id;
    const reference_id = Number(req.body.reference_id);
    const type = Number(req.body.type);
    const action = Number(req.body.action);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized user",
        data: [],
      });
    }

    if (!reference_id || !type || ![0, 1].includes(action)) {
      return res.status(400).json({
        status: "error",
        message: "reference_id, type and valid action are required",
        data: [],
      });
    }

    if (![1, 2, 6].includes(type)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid favourite type",
        data: [],
      });
    }

    const target = await resolveFavoriteTarget(reference_id, type);

    if (!target) {
      return res.status(404).json({
        status: "error",
        message: `${TYPE_MAP[type] || "Item"} not found`,
        data: [],
      });
    }

    const existing = await Favorite.findOne({
      user_id: userId,
      reference_id,
      type,
    });

    if (action === 1) {
      if (!existing) {
        const sql_id = await getNextSqlId();

        await Favorite.create({
          sql_id,
          user_id: userId,
          reference_id,
          temple_id: target.temple_id,
          type,
          status: 1,
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Favourite added successfully",
        data: [],
      });
    }

    await Favorite.deleteOne({
      user_id: userId,
      reference_id,
      type,
    });

    return res.status(200).json({
      status: "success",
      message: "Favourite removed successfully",
      data: [],
    });
  } catch (error) {
    console.error("Favourite API Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong while updating favourite",
      data: [],
    });
  }
};

exports.favouriteGet = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.max(Number(req.query.per_page) || 10, 1);
    const skip = (page - 1) * perPage;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized user",
        data: null,
      });
    }

    const totalCount = await Favorite.countDocuments({ user_id: userId });

    const favorites = await Favorite.find({ user_id: userId })
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const mapped = [];

    for (const fav of favorites) {
      const target = await resolveFavoriteTarget(fav.reference_id, fav.type);

      if (!target) continue;

      mapped.push({
        id: Number(fav.sql_id) || 0,
        user_id: 0,
        reference_id: Number(fav.reference_id) || 0,
        temple_id: target.temple_id || 0,
        temple_name: target.temple_name || "",
        type: Number(fav.type) || 0,
        type_str: target.type_str || "",
        name: target.name || "",
        description: target.description || "",
        image: target.image || "",
        is_favorite: 1,
      });
    }

    const totalPages = Math.ceil(totalCount / perPage) || 1;
    const isNext = page < totalPages;
    const isPrev = page > 1;

    return res.status(200).json({
      status: "success",
      message: "Favourite list fetched successfully",
      data: {
        data: mapped,
        total_count: totalCount,
        is_next: isNext,
        is_prev: isPrev,
        total_pages: totalPages,
        current_page: page,
        per_page: perPage,
        from: mapped.length ? skip + 1 : 0,
        to: mapped.length ? skip + mapped.length : 0,
        next_page_url: isNext ? `/api/v1/favourite/list?page=${page + 1}&per_page=${perPage}` : null,
        prev_page_url: isPrev ? `/api/v1/favourite/list?page=${page - 1}&per_page=${perPage}` : null,
        path: "/api/v1/favourite/list",
        has_pages: totalPages > 1,
        links: [],
      },
    });
  } catch (error) {
    console.error("Favourite List API Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong while fetching favourites",
      data: null,
    });
  }
};