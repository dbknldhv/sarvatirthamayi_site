const Favorite = require("../../models/Favorite");
const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Offer = require("../../models/Offer");
const mongoose = require("mongoose");

const baseUrl = "https://api.sarvatirthamayi.com/";

/**
 * 🔒 Validates numeric user ID
 */
const getAuthUserId = (req) => {
  const id = Number(req.user?.sql_id || req.user?.user_id);
  return isNaN(id) || id <= 0 ? null : id;
};

const formatImageUrl = (imgPath) => {
  if (!imgPath) return `${baseUrl}uploads/default.png`;
  if (String(imgPath).startsWith("http")) return imgPath;
  const cleanPath = String(imgPath).replace(/\\/g, "/");
  return `${baseUrl}${cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath}`;
};

/**
 * Resolve Favourite Target (Temple / Ritual)
 */
const resolveFavoriteTarget = async (referenceId, type) => {
  const favType = Number(type);
  const rawId = referenceId;

  try {
    let targetDoc = null;

    if (favType === 1) {
      targetDoc = await Temple.findOne({
        $or: [
          { sql_id: Number(rawId) || -1 },
          { _id: mongoose.Types.ObjectId.isValid(rawId) ? rawId : new mongoose.Types.ObjectId() }
        ],
        status: 1
      }).lean();

      if (!targetDoc) return null;

      return {
        id: Number(targetDoc.sql_id) || 0,
        temple_id: Number(targetDoc.sql_id) || 0,
        name: targetDoc.name || "",
        description: targetDoc.short_description || "",
        image: targetDoc.image || "",
        temple_name: targetDoc.name || "",
        type_str: "Temple"
      };
    }

    if (favType === 2) {
      targetDoc = await Ritual.findOne({
        $or: [
          { sql_id: Number(rawId) || -1 },
          { _id: mongoose.Types.ObjectId.isValid(rawId) ? rawId : new mongoose.Types.ObjectId() }
        ],
        status: 1
      }).populate("temple_id").lean();

      if (!targetDoc) return null;

      return {
        id: Number(targetDoc.sql_id) || 0,
        temple_id: Number(targetDoc.temple_id?.sql_id || 0),
        name: targetDoc.name || "",
        description: targetDoc.description || "",
        image: targetDoc.image || "",
        temple_name: targetDoc.temple_id?.name || "",
        type_str: "Ritual"
      };
    }

    return null;

  } catch (e) {
    return null;
  }
};

/**
 * Add / Remove Favourite
 */
exports.favourite = async (req, res) => {
  try {

    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { reference_id, type, action } = req.body;

    if (!reference_id || !type) {
      return res.status(400).json({ status: "error", message: "Missing fields" });
    }

    const target = await resolveFavoriteTarget(reference_id, type);
    if (!target) {
      return res.status(404).json({ status: "error", message: "Target not found" });
    }

    const filter = {
      user_id: userId,
      reference_id: Number(target.id),
      type: Number(type)
    };

    if (Number(action) === 1) {

      const existing = await Favorite.findOne(filter).lean();

      if (!existing) {

        const lastDoc = await Favorite.findOne().sort({ sql_id: -1 }).lean();

        await Favorite.create({
          sql_id: (lastDoc?.sql_id || 0) + 1,
          user_id: userId,
          reference_id: Number(target.id),
          temple_id: Number(target.temple_id),
          type: Number(type),
          status: 1
        });
      }

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Favourite added successfully"
      });

    } else {

      await Favorite.deleteOne(filter);

      return res.status(200).json({
        status: "success",
        success: true,
        message: "Favourite removed successfully"
      });
    }

  } catch (error) {
    return res.status(500).json({
      status: "error",
      success: false,
      message: error.message
    });
  }
};

/**
 * Get Favourite List
 */
exports.favouriteGet = async (req, res) => {

  try {

    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.max(Number(req.query.per_page) || 10, 1);

    const skip = (page - 1) * perPage;

    const query = { user_id: userId, status: 1 };

    const totalCount = await Favorite.countDocuments(query);

    const favorites = await Favorite.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const mappedData = [];

    for (const fav of favorites) {

      const target = await resolveFavoriteTarget(fav.reference_id, fav.type);

      if (target) {

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
          is_favorite: 1
        });

      }
    }

    const totalPages = Math.max(Math.ceil(totalCount / perPage), 1);

    return res.status(200).json({

      status: "success",
      success: true,
      message: "Favourite list fetched successfully",

      data: {

        data: mappedData,

        total_count: totalCount,
        is_next: page < totalPages,
        is_prev: page > 1,

        total_pages: totalPages,
        current_page: page,
        per_page: perPage,

        from: mappedData.length ? skip + 1 : 0,
        to: skip + mappedData.length,

        next_page_url: page < totalPages ? `${baseUrl}api/v1/favorite/index?page=${page + 1}` : null,
        prev_page_url: page > 1 ? `${baseUrl}api/v1/favorite/index?page=${page - 1}` : null,

        path: `${baseUrl}api/v1/favorite/index`,

        has_pages: totalPages > 1,
        links: []
      }

    });

  } catch (error) {

    return res.status(200).json({

      status: "error",
      success: false,
      message: error.message,

      data: {
        data: [],
        total_count: 0,
        is_next: false,
        is_prev: false,
        total_pages: 0,
        current_page: 1,
        per_page: 10,
        from: 0,
        to: 0,
        next_page_url: null,
        prev_page_url: null,
        path: `${baseUrl}api/v1/favorite/index`,
        has_pages: false,
        links: []
      }

    });
  }
};