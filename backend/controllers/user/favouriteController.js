const Favorite = require("../../models/Favorite");
const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Offer = require("../../models/Offer");

const baseUrl = "https://api.sarvatirthamayi.com/";

const formatImageUrl = (imgPath) => {
  if (!imgPath) return `${baseUrl}uploads/default.png`;
  if (String(imgPath).startsWith("http")) return imgPath;
  const cleanPath = String(imgPath).replace(/\\/g, "/");
  return `${baseUrl}${cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath}`;
};

const getUserNumericId = (req) => {
  return Number(req.user?.sql_id || req.user?.user_id || req.user?.id || 0);
};

const getNextSqlId = async () => {
  const lastDoc = await Favorite.findOne().sort({ sql_id: -1 }).lean();
  return Number(lastDoc?.sql_id || 0) + 1;
};

const getTempleBySqlId = async (sqlId) => {
  return Temple.findOne({
    sql_id: Number(sqlId),
    status: 1,
  }).lean();
};

const getRitualBySqlId = async (sqlId) => {
  return Ritual.findOne({
    sql_id: Number(sqlId),
    status: 1,
  })
    .populate("temple_id")
    .lean();
};

const getOfferByReferenceId = async (referenceId) => {
  return Offer.findOne({
    reference_id: Number(referenceId),
    status: 1,
  }).lean();
};

const resolveFavoriteTarget = async (referenceId, type) => {
  const refId = Number(referenceId);
  if (!refId) return null;

  if (Number(type) === 1) {
    const temple = await getTempleBySqlId(refId);
    if (!temple) return null;

    return {
      reference_id: Number(temple.sql_id) || refId,
      temple_id: Number(temple.sql_id) || 0,
      temple_name: temple.name || "",
      type_str: "Temple",
      name: temple.name || "",
      description: temple.short_description || "",
      image: temple.image || "",
    };
  }

  if (Number(type) === 2) {
    const ritual = await getRitualBySqlId(refId);
    if (!ritual) return null;

    return {
      reference_id: Number(ritual.sql_id) || refId,
      temple_id: Number(ritual?.temple_id?.sql_id || 0),
      temple_name: ritual?.temple_id?.name || "",
      type_str: "Ritual",
      name: ritual.name || "",
      description: ritual.description || "",
      image: ritual.image || "",
    };
  }

  if (Number(type) === 6) {
    const offer = await getOfferByReferenceId(refId);
    if (!offer) return null;

    let templeName = "";
    if (offer.temple_id) {
      const temple = await getTempleBySqlId(offer.temple_id);
      templeName = temple?.name || "";
    }

    return {
      reference_id: Number(offer.reference_id) || refId,
      temple_id: Number(offer.temple_id || 0),
      temple_name: templeName,
      type_str: "Offer",
      name: offer.name || "",
      description: offer.description || "",
      image: offer.image || "",
    };
  }

  return null;
};

exports.favourite = async (req, res) => {
  try {
    const userId = getUserNumericId(req);
    const reference_id = Number(req.body.reference_id);
    const type = Number(req.body.type);
    const action = Number(req.body.action);

    if (!userId) {
      return res.status(401).json({
        status: "error",
        success: false,
        message: "Unauthorized user",
        data: [],
      });
    }

    if (!reference_id || !type || ![0, 1].includes(action)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "reference_id, type and action are required",
        data: [],
      });
    }

    if (![1, 2, 6].includes(type)) {
      return res.status(400).json({
        status: "error",
        success: false,
        message: "Invalid favourite type",
        data: [],
      });
    }

    const target = await resolveFavoriteTarget(reference_id, type);
    if (!target) {
      return res.status(404).json({
        status: "error",
        success: false,
        message: "Favourite target not found",
        data: [],
      });
    }

    const filter = {
      user_id: userId,
      reference_id,
      type,
    };

    if (action === 1) {
      const existing = await Favorite.findOne(filter).lean();

      if (!existing) {
        const sql_id = await getNextSqlId();

        await Favorite.create({
          sql_id,
          user_id: userId,
          reference_id,
          temple_id: Number(target.temple_id || 0),
          type,
          status: 1,
        });
      }

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Favourite added successfully",
        data: [],
      });
    }

    await Favorite.deleteOne(filter);

    return res.status(200).json({
      status: "success",
      success: true,
      message: "Favourite removed successfully",
      data: [],
    });
  } catch (error) {
    console.error("Favourite API Error:", error);
    return res.status(500).json({
      status: "error",
      success: false,
      message: error.message,
      data: [],
    });
  }
};

exports.favouriteGet = async (req, res) => {
  try {
    const userId = getUserNumericId(req);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.max(Number(req.query.per_page) || 10, 1);
    const skip = (page - 1) * perPage;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        success: false,
        message: "Unauthorized user",
        data: {
          data: [],
          total_count: 0,
          current_page: page,
          per_page: perPage,
          total_pages: 0,
          is_next: false,
          is_prev: false,
          next_page_url: null,
          prev_page_url: null,
          path: `${baseUrl}api/v1/favorite/index`,
          has_pages: false,
          links: [],
        },
      });
    }

    const query = { user_id: userId };

    const totalCount = await Favorite.countDocuments(query);

    const favorites = await Favorite.find(query)
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const mappedData = [];

    for (const fav of favorites) {
      const target = await resolveFavoriteTarget(fav.reference_id, fav.type);
      if (!target) continue;

      mappedData.push({
        id: Number(fav.sql_id) || 0,
        user_id: Number(fav.user_id) || 0,
        reference_id: Number(fav.reference_id) || 0,
        temple_id: Number(target.temple_id) || 0,
        temple_name: target.temple_name || "",
        type: Number(fav.type) || 0,
        type_str: target.type_str || "",
        name: target.name || "",
        description: target.description || "",
        image: formatImageUrl(target.image),
        is_favorite: 1,
      });
    }

    const totalPages = Math.max(Math.ceil(totalCount / perPage), 1);

    return res.status(200).json({
      status: "success",
      success: true,
      message: "Favourite list fetched successfully",
      data: {
        data: mappedData,
        total_count: totalCount,
        current_page: page,
        per_page: perPage,
        total_pages: totalPages,
        is_next: page < totalPages,
        is_prev: page > 1,
        from: mappedData.length ? skip + 1 : 0,
        to: mappedData.length ? skip + mappedData.length : 0,
        next_page_url:
          page < totalPages
            ? `${baseUrl}api/v1/favorite/index?page=${page + 1}&per_page=${perPage}`
            : null,
        prev_page_url:
          page > 1
            ? `${baseUrl}api/v1/favorite/index?page=${page - 1}&per_page=${perPage}`
            : null,
        path: `${baseUrl}api/v1/favorite/index`,
        has_pages: totalPages > 1,
        links: [],
      },
    });
  } catch (error) {
    console.error("Favourite Get Error:", error);
    return res.status(500).json({
      status: "error",
      success: false,
      message: error.message,
      data: {
        data: [],
        total_count: 0,
        current_page: 1,
        per_page: 10,
        total_pages: 0,
        is_next: false,
        is_prev: false,
        next_page_url: null,
        prev_page_url: null,
        path: `${baseUrl}api/v1/favorite/index`,
        has_pages: false,
        links: [],
      },
    });
  }
};