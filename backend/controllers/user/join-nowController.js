// controllers/user/join-nowController.js
const Temple = require("../../models/Temple");
const State = require("../../models/State");
const Membership = require("../../models/Membership");

/**
 * 1. Get States (For Dropdown)
 * Matches: StateModel in Flutter
 */
exports.getPublicStates = async (req, res) => {
    try {
        const uniqueStateNames = await State.distinct("name", { status: 1 });
        const states = uniqueStateNames.sort().map((name, index) => ({
            _id: index, 
            name: name
        }));

        res.status(200).json({
            status: "true",
            success: true,
            data: states
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 2. Get Public Temples (List View)
 * Matches: TempleListModel.dart
 * FIX: Wrapped in pagination object to avoid "Expected Map but got List" crash.
 */
exports.getPublicTemples = async (req, res) => {
    try {
        const { stateName, search, page = 1, per_page = 15 } = req.query; 
        let query = { status: 1 };

        if (stateName && stateName.trim() !== "" && stateName !== "undefined") {
            query.state_name = { $regex: new RegExp(stateName.trim(), "i") };
        }
        
        if (search && search.trim() !== "") {
            query.name = { $regex: new RegExp(search.trim(), "i") };
        }

        const currentPage = parseInt(page);
        const limit = parseInt(per_page);
        const skip = (currentPage - 1) * limit;

        const totalCount = await Temple.countDocuments(query);
        const temples = await Temple.find(query)
            .sort({ sequence: 1 })
            .skip(skip)
            .limit(limit);

        const templeData = temples.map(t => ({
            id: t._id, // Used for the "Show Details" event in Bloc
            sql_id: t.sql_id || 0,
            name: t.name || "",
            image: t.image || "",
            image_thumb: t.image || "",
            state_name: t.state_name || "",
            city_name: t.city_name || "",
            short_description: t.short_description || "",
            visit_price: t.visit_price || 0,
            sequence: t.sequence || 0,
            is_favorite: 0
        }));

        return res.status(200).json({
            status: "true",
            success: true,
            message: "Temples list fetch successfully", // Matches Constants.templeListFetchSuccessMsg
            data: {
                data: templeData,
                total_count: totalCount,
                is_next: (skip + templeData.length) < totalCount,
                is_prev: currentPage > 1,
                total_pages: Math.ceil(totalCount / limit),
                current_page: currentPage,
                per_page: limit,
                from: skip + 1,
                to: skip + templeData.length,
                path: req.originalUrl,
                has_pages: totalCount > limit,
                links: []
            }
        });
    } catch (error) {
        res.status(500).json({
            status: "false",
            success: false,
            message: error.message
        });
    }
};

/**
 * 3. Get Temple By ID (Detail View)
 * Matches: TempleShowDetailModel.dart
 * FIX: Maps nested Address object and casts visit_price to String.
 */
exports.getPublicTempleById = async (req, res) => {
    try {
        const { id } = req.params;
        const temple = await Temple.findById(id);

        if (!temple) {
            return res.status(404).json({
                status: "false",
                success: false,
                message: "Temple not found"
            });
        }

        // 🎯 Matching the "Data" class in temple_show_model.dart exactly
        const formattedData = {
            id: temple.sql_id || 0,
            name: temple.name || "",
            short_description: temple.short_description || "",
            long_description: temple.long_description || temple.description || "",
            mobile_number: temple.mobile_number || "",
            visit_price: String(temple.visit_price || "0"), // MUST be String
            address: {
                full_address: temple.full_address || `${temple.city_name}, ${temple.state_name}`,
                address_line1: temple.address_line1 || temple.name || "",
                address_line2: temple.address_line2 || temple.city_name || "",
                landmark: temple.landmark || "",
                city: temple.city_name || "",
                state: temple.state_name || "",
                pincode: temple.pincode || "",
                country: "India",
                latitude: String(temple.latitude || ""),
                longitude: String(temple.longitude || ""),
                address_url: temple.map_url || ""
            },
            open_time: temple.open_time || "06:00 AM",
            close_time: temple.close_time || "09:00 PM",
            is_favorite: 0,
            devotees_booked_count: temple.devotees_booked_count || 0,
            image: temple.image || "",
            image_thumb: temple.image || ""
        };

        res.status(200).json({
            status: "true",
            success: true,
            message: "Temple fetched successfully.", // Matches Constants.templeDetailFetchSuccessMsg
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({
            status: "false",
            success: false,
            message: "Error fetching temple details",
            error: error.message
        });
    }
};

/**
 * 4. Get Active Membership Plans
 */
exports.getActiveMembershipPlans = async (req, res) => {
    try {
        const plans = await Membership.find({ status: 1 }).sort({ price: 1 });

        res.status(200).json({
            status: "true",
            success: true,
            message: "Membership plans fetched successfully",
            count: plans.length,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            status: "false",
            success: false,
            message: "Error fetching membership plans",
            error: error.message
        });
    }
};