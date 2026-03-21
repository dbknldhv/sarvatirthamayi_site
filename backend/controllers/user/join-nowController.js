// controllers/user/join-nowController.js
const Temple = require("../../models/Temple");
const State = require("../../models/State");
const Membership = require("../../models/Membership");

// --- 1. Get States (For Dropdown) ---
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

// --- 2. Get Public Temples (Matches TempleListModel) ---
exports.getPublicTemples = async (req, res) => {
    try {
        const { stateName, search, page = 1, per_page = 10 } = req.query; 
        let query = { status: 1 };

        if (stateName && stateName.trim() !== "" && stateName !== "undefined") {
            query.state_name = { $regex: new RegExp(stateName.trim(), "i") };
        }
        
        if (search && search.trim() !== "") {
            query.name = { $regex: new RegExp(search.trim(), "i") };
        }

        const skip = (parseInt(page) - 1) * parseInt(per_page);
        const totalCount = await Temple.countDocuments(query);
        const temples = await Temple.find(query)
            .sort({ sequence: 1 })
            .skip(skip)
            .limit(parseInt(per_page));

        // 🎯 Mapping to match Temple class in Flutter
        const templeData = temples.map(t => ({
            id: t.sql_id || 0, 
            name: t.name || "",
            sequence: t.sequence || 0,
            is_favorite: 0,
            image: t.image || "",
            image_thumb: t.image || ""
        }));

        return res.status(200).json({
            status: "true",
            message: "Temples list fetch successfully", // Matches Constants.templeListFetchSuccessMsg
            data: {
                data: templeData,
                total_count: totalCount,
                is_next: (skip + templeData.length) < totalCount,
                is_prev: parseInt(page) > 1,
                total_pages: Math.ceil(totalCount / parseInt(per_page)),
                current_page: parseInt(page),
                per_page: parseInt(per_page),
                from: skip + 1,
                to: skip + templeData.length,
                next_page_url: null,
                prev_page_url: null,
                path: "",
                has_pages: totalCount > parseInt(per_page),
                links: []
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

// --- 3. Get Temple By ID (Matches TempleShowDetailModel) ---
exports.getPublicTempleById = async (req, res) => {
    try {
        const { id } = req.params;
        const temple = await Temple.findById(id);

        if (!temple) {
            return res.status(404).json({ status: "false", success: false, message: "Temple not found" });
        }

        // 🎯 Formatting to match Data class in temple_show_model.dart
        const formattedData = {
            id: temple.sql_id || 0,
            name: temple.name || "",
            short_description: temple.short_description || "",
            long_description: temple.long_description || "",
            mobile_number: temple.mobile_number || "",
            visit_price: String(temple.visit_price || "0"),
            address: {
                full_address: temple.address?.full || temple.full_address || "",
                city: temple.city_name || "",
                state: temple.state_name || "",
                pincode: temple.pincode || "",
                country: "India",
                latitude: temple.latitude || "",
                longitude: temple.longitude || ""
            },
            open_time: temple.open_time || "06:00 AM",
            close_time: temple.close_time || "09:00 PM",
            is_favorite: 0,
            devotees_booked_count: temple.booking_count || 0,
            image: temple.image || "",
            image_thumb: temple.image || ""
        };

        res.status(200).json({
            status: "true",
            message: "Temple fetched successfully.", // Matches Constants.templeDetailFetchSuccessMsg
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

// --- 4. Get Membership Plans ---
exports.getActiveMembershipPlans = async (req, res) => {
    try {
        const plans = await Membership.find({ status: 1 }).sort({ price: 1 });
        res.status(200).json({
            status: "true",
            success: true,
            data: plans
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};