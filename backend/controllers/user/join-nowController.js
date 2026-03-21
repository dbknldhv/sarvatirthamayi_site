const Temple = require("../../models/Temple");
const State = require("../../models/State");
const Membership = require("../../models/Membership");

/**
 * 1. Get States
 * Route: GET /api/v1/states
 */
exports.getPublicStates = async (req, res) => {
    try {
        const states = await State.distinct("name", { status: 1 });
        const formattedStates = states.sort().map((name, index) => ({ _id: index, name: name }));
        res.status(200).json({ status: "true", success: true, data: formattedStates });
    } catch (error) {
        res.status(500).json({ status: "false", success: false, message: error.message });
    }
};

/**
 * 2. Get Public Temples (List View)
 * Route: GET /api/v1/temples
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
        const skip = (parseInt(page) - 1) * parseInt(per_page);
        const totalCount = await Temple.countDocuments(query);
        const temples = await Temple.find(query).sort({ sequence: 1 }).skip(skip).limit(parseInt(per_page));

        const templeData = temples.map(t => ({
            id: t._id,
            sql_id: t.sql_id || 0,
            name: t.name || "",
            image: t.image || "",
            image_thumb: t.image || "",
            visit_price: t.visit_price || 0,
            is_favorite: 0
        }));

        res.status(200).json({
            status: "true",
            success: true,
            message: "Temples list fetch successfully",
            data: {
                data: templeData,
                total_count: totalCount,
                is_next: (skip + templeData.length) < totalCount,
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / parseInt(per_page))
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

/**
 * 3. Get Temple Details (Detail View)
 * Route: GET /api/v1/temples/:id
 */
exports.getPublicTempleById = async (req, res) => {
    try {
        const temple = await Temple.findById(req.params.id);
        if (!temple) return res.status(404).json({ status: "false", message: "Temple not found" });

        const formattedData = {
            id: temple.sql_id || 0,
            name: temple.name || "",
            short_description: temple.short_description || "Sacred pilgrimage site.",
            long_description: temple.long_description || temple.description || "",
            mobile_number: temple.mobile_number || "",
            visit_price: String(temple.visit_price || "0"),
            address: {
                full_address: temple.full_address || "",
                address_line1: temple.address_line1 || "",
                address_line2: temple.address_line2 || "",
                city: temple.city_name || "",
                state: temple.state_name || "",
                pincode: temple.pincode || "",
                country: "India"
            },
            open_time: temple.open_time || "06:00 AM",
            close_time: temple.close_time || "09:00 PM",
            is_favorite: temple.is_favorite || 0,
            image: temple.image || "",
            image_thumb: temple.image || ""
        };
        res.status(200).json({ status: "true", success: true, message: "Temple fetched successfully.", data: formattedData });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

/**
 * 4. Get Active Membership Plans (CRITICAL: Fixes the 502 crash)
 * Route: GET /api/v1/membership-plans
 */
exports.getActiveMembershipPlans = async (req, res) => {
    try {
        const plans = await Membership.find({ status: 1 }).sort({ price: 1 });
        res.status(200).json({ 
            status: "true", 
            success: true, 
            message: "Membership plans fetched successfully",
            data: plans 
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};