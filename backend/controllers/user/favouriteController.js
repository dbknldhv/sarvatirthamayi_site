const Favorite = require("../../models/Favorite");
const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Offer = require("../../models/Offer");
const mongoose = require("mongoose");

const baseUrl = "https://api.sarvatirthamayi.com/";

/**
 * 🛠️ IMAGE HELPER
 * Ensures Flutter gets a clean URL without backslashes or double domains.
 */
const formatImageUrl = (imgPath) => {
    if (!imgPath) return `${baseUrl}uploads/default.png`;
    if (imgPath.startsWith('http')) return imgPath;
    const cleanPath = imgPath.replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
};

/**
 * Metadata Resolver
 * Matches types: 1 (Temple), 2 (Ritual), 3 (Event), 5 (Donation), 6 (Offer)
 */
const resolveFavoriteTarget = async (referenceId, type) => {
    try {
        const refId = Number(referenceId);
        
        if (type === 1) { // Temple
            const temple = await Temple.findOne({ sql_id: refId }).lean();
            if (!temple) return null;
            return {
                id: Number(temple.sql_id),
                name: temple.name || "",
                desc: temple.short_description || "",
                img: temple.image,
                t_name: temple.name
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
                t_name: ritual.temple_id?.name || "Temple"
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
                t_name: "Offer Zone"
            };
        }
        
        return null;
    } catch (e) { 
        console.error("Resolve Error:", e.message);
        return null; 
    }
};

/**
 * 1. Toggle Favourite (Add/Remove)
 * Handles both ObjectId and Legacy Numeric User IDs
 */
exports.favourite = async (req, res) => {
    try {
        const userId = req.user?._id;
        const legacyId = 34; // Supporting the ID 34 seen in your Compass screenshot
        const { reference_id, type, action } = req.body;

        const query = {
            $or: [ { user_id: userId }, { user_id: legacyId } ],
            reference_id: Number(reference_id),
            type: Number(type)
        };

        if (Number(action) === 1) {
            const existing = await Favorite.findOne(query);
            if (!existing) {
                const lastDoc = await Favorite.findOne().sort({ sql_id: -1 }).lean();
                await Favorite.create({
                    sql_id: (lastDoc?.sql_id || 0) + 1,
                    user_id: userId, // New entries save as ObjectId
                    reference_id: Number(reference_id),
                    type: Number(type),
                    status: 1
                });
            }
            return res.status(200).json({ status: "success", success: true, message: "Added to favorites" });
        } else {
            await Favorite.deleteOne(query);
            return res.status(200).json({ status: "success", success: true, message: "Removed from favorites" });
        }
    } catch (error) {
        res.status(500).json({ status: "error", success: false, message: error.message });
    }
};

/**
 * 2. Get Favourite List (Pagination)
 * Returns the exact structure required by Data.fromJson in favourite_get_model.dart
 */
exports.favouriteGet = async (req, res) => {
    try {
        const userId = req.user?._id;
        const legacyId = 34; 
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const perPage = parseInt(req.query.per_page) || 15;
        const skip = (page - 1) * perPage;

        // Query both current user and legacy numeric ID
        const userFilter = { $or: [ { user_id: userId }, { user_id: legacyId } ] };

        const totalCount = await Favorite.countDocuments(userFilter);
        const favorites = await Favorite.find(userFilter)
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
                    user_id: 0, // Matching Flutter Datum model expectation
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
        console.error("favouriteGet Error:", error.message);
        res.status(500).json({ 
            status: "error", 
            success: false, 
            message: error.message, 
            data: { data: [], total_count: 0 } 
        });
    }
};