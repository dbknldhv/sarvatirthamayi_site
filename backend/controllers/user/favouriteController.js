const Favorite = require("../../models/Favorite");
const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Offer = require("../../models/Offer");
const mongoose = require("mongoose");

const baseUrl = "https://api.sarvatirthamayi.com/";

/**
 * 🛠️ IMAGE HELPER
 */
const formatImageUrl = (imgPath) => {
    if (!imgPath) return `${baseUrl}uploads/default.png`;
    if (imgPath.startsWith('http')) return imgPath;
    const cleanPath = imgPath.replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
};

const resolveFavoriteTarget = async (referenceId, type) => {
    try {
        if (type === 1) { // Temple
            const temple = await Temple.findOne({ sql_id: Number(referenceId) }).lean();
            if (!temple) return null;
            return {
                id: Number(temple.sql_id),
                name: temple.name || "",
                description: temple.short_description || "",
                image: formatImageUrl(temple.image),
                temple_name: temple.name || "",
                type_str: "Temple"
            };
        }
        if (type === 2) { // Ritual
            const ritual = await Ritual.findOne({ sql_id: Number(referenceId) }).populate("temple_id").lean();
            if (!ritual) return null;
            return {
                id: Number(ritual.sql_id),
                name: ritual.name || "",
                description: ritual.description || "",
                image: formatImageUrl(ritual.image),
                temple_name: ritual.temple_id?.name || "Temple",
                type_str: "Ritual"
            };
        }
        // ... (Keep Offer logic if needed, applying formatImageUrl)
        return null;
    } catch (e) { return null; }
};

/**
 * 1. Toggle Favourite (Add/Remove)
 */
exports.favourite = async (req, res) => {
    try {
        const userId = req.user._id;
        const { reference_id, type, action } = req.body;

        if (Number(action) === 1) {
            const existing = await Favorite.findOne({ user_id: userId, reference_id: Number(reference_id), type: Number(type) });
            if (!existing) {
                const lastDoc = await Favorite.findOne().sort({ sql_id: -1 }).lean();
                const sql_id = (lastDoc?.sql_id || 0) + 1;
                await Favorite.create({
                    sql_id,
                    user_id: userId,
                    reference_id: Number(reference_id),
                    type: Number(type),
                    status: 1
                });
            }
            return res.status(200).json({ status: "success", message: "Added to favorites", data: [] });
        } else {
            await Favorite.deleteOne({ user_id: userId, reference_id: Number(reference_id), type: Number(type) });
            return res.status(200).json({ status: "success", message: "Removed from favorites", data: [] });
        }
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

/**
 * 2. Get Favourite List (Pagination)
 * Matches: FavouriteBloc._favouriteGetList
 */
exports.favouriteGet = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.per_page) || 15;
        const skip = (page - 1) * perPage;

        const totalCount = await Favorite.countDocuments({ user_id: userId });
        const favorites = await Favorite.find({ user_id: userId }).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean();

        const mappedData = [];
        for (const fav of favorites) {
            const target = await resolveFavoriteTarget(fav.reference_id, fav.type);
            if (target) {
                mappedData.push({
                    id: Number(fav.sql_id),
                    reference_id: Number(fav.reference_id),
                    temple_id: target.id,
                    temple_name: target.temple_name,
                    type: Number(fav.type),
                    type_str: target.type_str,
                    name: target.name,
                    description: target.description,
                    image: target.image,
                    is_favorite: 1
                });
            }
        }

        // 🎯 EXACT Pagination structure to prevent Flutter crash
        return res.status(200).json({
            status: "success",
            message: "Favourite list fetched successfully",
            data: {
                data: mappedData,
                total_count: totalCount,
                current_page: page,
                per_page: perPage,
                total_pages: Math.ceil(totalCount / perPage),
                next_page_url: (skip + mappedData.length) < totalCount ? `${baseUrl}api/v1/favorite/index?page=${page + 1}` : null,
                prev_page_url: page > 1 ? `${baseUrl}api/v1/favorite/index?page=${page - 1}` : null,
                is_next: (skip + mappedData.length) < totalCount,
                is_prev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message, data: { data: [] } });
    }
};