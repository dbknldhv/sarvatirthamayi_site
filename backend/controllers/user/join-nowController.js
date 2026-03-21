const Temple = require("../../models/Temple");
const State = require("../../models/State");
const Membership = require("../../models/Membership");

// --- 1. Get States ---
exports.getPublicStates = async (req, res) => {
    try {
        const states = await State.distinct("name", { status: 1 });
        const formattedStates = states.sort().map((name, index) => ({
            _id: index, 
            name: name
        }));

        res.status(200).json({
            status: "true",
            success: true,
            data: formattedStates
        });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

// --- 2. Get Public Temples (Matches TempleMainScreen Grid) ---
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

        const skip = (parseInt(page) - 1) * parseInt(per_page);
        const totalCount = await Temple.countDocuments(query);
        const temples = await Temple.find(query)
            .sort({ sequence: 1 })
            .skip(skip)
            .limit(parseInt(per_page));

        const templeData = temples.map(t => ({
            id: t._id, // Flutter Bloc uses this to fetch details
            name: t.name || "",
            sequence: t.sequence || 0,
            is_favorite: 0,
            image: t.image || "",
            image_thumb: t.image || ""
        }));

        return res.status(200).json({
            status: "true",
            message: "Temples list fetch successfully",
            data: {
                data: templeData,
                total_count: totalCount,
                is_next: (skip + templeData.length) < totalCount,
                is_prev: parseInt(page) > 1,
                total_pages: Math.ceil(totalCount / parseInt(per_page)),
                current_page: parseInt(page),
                per_page: parseInt(per_page)
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

// --- 3. Get Temple Details (Matches TempleDetailScreen.dart) ---
exports.getPublicTempleById = async (req, res) => {
    try {
        const { id } = req.params;
        const temple = await Temple.findById(id);

        if (!temple) {
            return res.status(404).json({ status: "false", message: "Temple not found" });
        }

        // 🎯 MAPS DIRECTLY TO YOUR FLUTTER UI FIELDS
        const formattedData = {
            id: temple.sql_id || 0,
            name: temple.name || "",
            short_description: temple.short_description || "Gorgeous pagoda gleams golden...",
            long_description: temple.long_description || temple.description || "",
            mobile_number: temple.mobile_number || "Contact support",
            visit_price: String(temple.visit_price || "0"), // String as per model
            address: {
                full_address: temple.address?.full || "",
                address_line1: temple.address?.line1 || temple.city_name || "",
                address_line2: temple.address?.line2 || "",
                landmark: temple.address?.landmark || "",
                city: temple.city_name || "",
                state: temple.state_name || "",
                pincode: temple.pincode || "",
                country: "India"
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
            message: "Temple fetched successfully.", 
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};