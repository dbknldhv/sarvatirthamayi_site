const Favorite = require("../../models/Favorite");
const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Offer = require("../../models/Offer");
const User = require("../../models/User");

const baseUrl = "https://api.sarvatirthamayi.com/";

/**
 * 🛠️ IMAGE HELPER
 */
const formatImageUrl = (imgPath) => {
  if (!imgPath) return `${baseUrl}uploads/default.png`;
  if (String(imgPath).startsWith("http")) return imgPath;
  const cleanPath = String(imgPath).replace(/\\/g, "/");
  return `${baseUrl}${cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath}`;
};

/**
 * Metadata Resolver
 * Matches types: 1 (Temple), 2 (Ritual), 6 (Offer)
 */
const resolveFavoriteTarget = async (referenceId, type) => {
  try {
    const refId = Number(referenceId);
    const favType = Number(type);
    if (!refId || !favType) return null;

    if (favType === 1) { // Temple
      const temple = await Temple.findOne({ sql_id: refId, status: 1 }).lean();
      if (!temple) return null;
      return {
        id: Number(temple.sql_id),
        name: temple.name || "",
        description: temple.short_description || "",
        image: temple.image || "",
        temple_name: temple.name || "",
        type_str: "Temple"
      };
    }

    if (favType === 2) { // Ritual
      const ritual = await Ritual.findOne({ sql_id: refId, status: 1 }).populate("temple_id").lean();
      if (!ritual) return null;
      return {
        id: Number(ritual.sql_id),
        name: ritual.name || "",
        description: ritual.description || "",
        image: ritual.image || "",
        temple_name: ritual.temple_id?.name || "Temple",
        type_str: "Ritual"
      };
    }

    if (favType === 6) { // Offer
      const offer = await Offer.findOne({ reference_id: refId, status: 1 }).lean();
      if (!offer) return null;
      return {
        id: Number(offer.reference_id),
        name: offer.name || "Special Offer",
        description: offer.description || "",
        image: offer.image || "",
        temple_name: "Offer Zone",
        type_str: "Offer"
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * 1. Toggle Favourite (Add/Remove)
 */
exports.favourite = async (req, res) => {
  try {
    // 🎯 Logic: Extract numeric ID from session or use legacy fallback
    const userId = Number(req.user?.sql_id || 34); 
    const { reference_id, type, action } = req.body;

    if (!reference_id || !type) {
      return res.status(400).json({ status: "error", success: false, message: "Missing reference_id or type" });
    }

    const filter = {
      user_id: userId, // ✅ FIXED: No 'Numer' typo here
      reference_id: Number(reference_id),
      type: Number(type)
    };

    if (Number(action) === 1) {
      const existing = await Favorite.findOne(filter).lean();
      if (!existing) {
        const lastDoc = await Favorite.findOne().sort({ sql_id: -1 }).lean();
        await Favorite.create({
          sql_id: (lastDoc?.sql_id || 0) + 1,
          user_id: userId,
          reference_id: Number(reference_id),
          type: Number(type),
          status: 1
        });
      }
      return res.status(200).json({ status: "success", success: true, message: "Favourite added successfully" });
    } else {
      await Favorite.deleteOne(filter);
      return res.status(200).json({ status: "success", success: true, message: "Favourite removed successfully" });
    }
  } catch (error) {
    console.error("Favourite API Error:", error.message);
    return res.status(500).json({ status: "error", success: false, message: error.message });
  }
};

/**
 * 2. Get Favourite List (Pagination)
 */
exports.favouriteGet = async (req, res) => {
  try {
    const userId = Number(req.user?.sql_id || 34);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.max(Number(req.query.per_page) || 10, 1);
    const skip = (page - 1) * perPage;

    const query = { user_id: userId, status: 1 };
    const totalCount = await Favorite.countDocuments(query);
    const favorites = await Favorite.find(query).sort({ created_at: -1 }).skip(skip).limit(perPage).lean();

    const mappedData = [];
    for (const fav of favorites) {
      const target = await resolveFavoriteTarget(fav.reference_id, fav.type);
      if (target) {
        mappedData.push({
          id: Number(fav.sql_id) || 0,
          user_id: Number(fav.user_id) || 0,
          reference_id: Number(fav.reference_id) || 0,
          temple_id: Number(target.id) || 0,
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
        current_page: page,
        per_page: perPage,
        total_pages: totalPages,
        is_next: page < totalPages,
        is_prev: page > 1,
        path: `${baseUrl}api/v1/favorite/index`
      }
    });
  } catch (error) {
    // 🎯 Return 200 with empty structure to prevent Flutter 'Null' crash
    return res.status(200).json({
      status: "error",
      success: false,
      message: error.message,
      data: { data: [], total_count: 0, current_page: 1, total_pages: 0 }
    });
  }
};