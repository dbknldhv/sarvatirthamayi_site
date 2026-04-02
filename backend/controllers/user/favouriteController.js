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
 * Helper to resolve metadata based on type
 * Type Map: 1: Temple, 2: Ritual, 3: Event, 5: Donation, 6: Offer
 */
const resolveFavoriteTarget = async (referenceId, type) => {
    try {
        const refId = Number(referenceId);
        if (type === 1) { // Temple
            const temple = await Temple.findOne({ sql_id: refId }).lean();
            return temple ? { 
                id: Number(temple.sql_id), name: temple.name, 
                desc: temple.short_description, img: temple.image, t_name: temple.name 
            } : null;
        }
        if (type === 2) { // Ritual
            const ritual = await Ritual.findOne({ sql_id: refId }).populate("temple_id").lean();
            return ritual ? { 
                id: Number(ritual.sql_id), name: ritual.name, 
                desc: ritual.description, img: ritual.image, t_name: ritual.temple_id?.name 
            } : null;
        }
        // Add cases for 3 (Event) and 5 (Donation) if models exist
        return null;
    } catch (e) { return null; }
};

/**
 * 1. Toggle Favourite (Add/Remove)
 * Handles the "type: 1" mismatch sent from Flutter during removal
 */
exports.favourite = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { reference_id, type, action } = req.body;

        if (Number(action) === 1) {
            // ADD LOGIC
            const existing = await Favorite.findOne({ 
                user_id: userId, reference_id: Number(reference_id), type: Number(type) 
            });
            
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
            // REMOVE LOGIC
            // Flutter often sends type: 1 for everything during removal. 
            // We search for the user_id + reference_id combo regardless of type to be safe.
            let deleteQuery = { user_id: userId, reference_id: Number(reference_id) };
            if (Number(type) !== 1) deleteQuery.type = Number(type);

            await Favorite.deleteOne(deleteQuery);
            return res.status(200).json({ status: "success", success: true, message: "Removed" });
        }
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

/**
 * 2. Get Favourite List
 * Matches gridBuilder in FavouriteScreen
 */
exports.favouriteGet = async (req, res) => {
    try {
        const userId = req.user?._id;
        const favorites = await Favorite.find({ user_id: userId }).sort({ created_at: -1 }).lean();

        const mappedData = [];
        for (const fav of favorites) {
            const target = await resolveFavoriteTarget(fav.reference_id, fav.type);
            if (target) {
                mappedData.push({
                    id: Number(fav.sql_id),
                    reference_id: Number(fav.reference_id), // used in mainOnTap
                    temple_id: Number(fav.temple_id) || Number(target.id), // used in BookingScreen calls
                    temple_name: target.t_name || "",
                    type: Number(fav.type), // determines navigation (2=Ritual, 3=Event, 5=Donation)
                    name: target.name || "",
                    description: target.desc || "",
                    image: formatImageUrl(target.img),
                    is_favorite: 1 // ensures heart stays purple
                });
            }
        }

        return res.status(200).json({
            status: "success",
            message: "Favourite list fetched successfully",
            data: {
                data: mappedData,
                total_count: mappedData.length,
                current_page: 1,
                total_pages: 1,
                is_next: false,
                is_prev: false
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message, data: { data: [] } });
    }
};