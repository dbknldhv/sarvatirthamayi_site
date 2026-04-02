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

/**
 * Metadata Resolver with fallback safety
 */
const resolveFavoriteTarget = async (referenceId, type) => {
    try {
        const refId = Number(referenceId);
        if (isNaN(refId)) return null;

        if (type === 1) { // Temple
            const temple = await Temple.findOne({ sql_id: refId }).lean();
            if (!temple) return null;
            return {
                id: Number(temple.sql_id),
                name: temple.name || "",
                desc: temple.short_description || "",
                img: temple.image,
                t_name: temple.name,
                type_str: "Temple"
            };
        }
        
        if (type === 2) { // Ritual
            const ritual = await Ritual.findOne({ sql_id: refId }).populate("temple_id").lean();
            if (!ritual) return null;
            return {
                id: Number(ritual.sql_id),
                name: ritual.name || "",
                desc: ritual.description || "",
                img: ritual.image,
                t_name: ritual.temple_id?.name || "Temple",
                type_str: "Ritual"
            };
        }

        if (type === 6) { // Offer
            const offer = await Offer.findOne({ reference_id: refId }).lean();
            if (!offer) return null;
            return {
                id: Number(offer.reference_id),
                name: offer.name || "Special Offer",
                desc: offer.description || "",
                img: offer.image,
                t_name: "Offer Zone",
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
 * SAFE FOR: ObjectId, Numeric ID, and String ID
 */
exports.favourite = async (req, res) => {
    try {
        const userId = req.user?._id;
        const legacyId = 34; // Supporting your numeric data in Compass
        const { reference_id, type, action } = req.body;

        // Construct a query that doesn't trigger strict Mongoose casting errors
        const userQuery = [
            { user_id: legacyId }
        ];
        
        if (mongoose.Types.ObjectId.isValid(userId)) {
            userQuery.push({ user_id: userId });
        }

        const filter = {
            $or: userQuery,
            reference_id: Number(reference_id),
            type: Number(type)
        };

        if (Number(action) === 1) {
            const existing = await Favorite.findOne(filter);
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
            return res.status(200).json({ status: "success", success: true, message: "Added" });
        } else {
            await Favorite.deleteOne(filter);
            return res.status(200).json({ status: "success", success: true, message: "Removed" });
        }
    } catch (error) {
        res.status(500).json({ status: "error", success: false, message: error.message });
    }
};

/**
 * 2. Get Favourite List (Pagination)
 */
exports.favouriteGet = async (req, res) => {
    try {
        const userId = req.user?._id;
        const legacyId = 34;

        // 🎯 USE A RAW ARRAY FOR FILTERING
        const userIds = [legacyId];
        if (userId) userIds.push(userId);

        const query = { user_id: { $in: userIds } }; // Simple "In" query works better with Mixed types

        const totalCount = await Favorite.countDocuments(query);
        const favorites = await Favorite.find(query)
            .sort({ created_at: -1 })
            .lean();

        const mappedData = [];
        for (const fav of favorites) {
            const target = await resolveFavoriteTarget(fav.reference_id, fav.type);
            if (target) {
                mappedData.push({
                    id: Number(fav.sql_id) || 0,
                    user_id: 0, 
                    reference_id: Number(fav.reference_id),
                    temple_id: Number(target.id),
                    temple_name: target.t_name || "",
                    type: Number(fav.type),
                    type_str: target.type_str || "Item",
                    name: target.name || "",
                    description: target.desc || "",
                    image: formatImageUrl(target.img),
                    is_favorite: 1
                });
            }
        }

        const totalPages = Math.max(Math.ceil(totalCount / perPage), 1);

        // 🎯 Structure strictly matching favourite_get_model.dart
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
                next_page_url: page < totalPages ? `${baseUrl}api/v1/favorite/index?page=${page + 1}` : null,
                prev_page_url: page > 1 ? `${baseUrl}api/v1/favorite/index?page=${page - 1}` : null,
                path: `${baseUrl}api/v1/favorite/index`,
                has_pages: totalPages > 1,
                links: []
            }
        });
    } catch (error) {
        res.status(200).json({ 
            status: "error", 
            success: false, 
            message: error.message, 
            data: { data: [], total_count: 0 } 
        });
    }
};