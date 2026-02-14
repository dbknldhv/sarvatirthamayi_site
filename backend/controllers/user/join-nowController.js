// controllers/user/join-nowController.js
const Temple = require("../../models/Temple");
const State = require("../../models/State");
const Membership = require("../../models/Membership");

exports.getPublicStates = async (req, res) => {
    try {
        const uniqueStateNames = await State.distinct("name", { status: 1 });
        const states = uniqueStateNames.sort().map((name, index) => ({
            _id: index, 
            name: name
        }));

        res.status(200).json({
            success: true,
            data: states
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// controllers/user/join-nowController.js

// controllers/user/join-nowController.js

exports.getPublicTemples = async (req, res) => {
    try {
        const { stateName, search } = req.query; 
        let query = { status: 1 };

        // 1. Filter by State (Handles the "All Regions" vs specific selection)
        // If stateName is empty, null, or "undefined", this block is skipped, showing ALL temples.
        if (stateName && stateName.trim() !== "" && stateName !== "undefined") {
            // Fuzzy regex: Removes strict start(^) and end($) anchors to catch "Telangana " or "Telangana"
            query.state_name = { $regex: new RegExp(stateName.trim(), "i") };
        }
        
        // 2. Filter by Search Term
        if (search && search.trim() !== "") {
            query.name = { $regex: new RegExp(search.trim(), "i") };
        }

        const temples = await Temple.find(query)
            .select('name image state_name short_description city_name visit_price')
            .sort({ sequence: 1 });

        res.status(200).json({
            success: true,
            count: temples.length,
            data: temples
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching temples",
            error: error.message
        });
    }
};

// --- ADD THIS NEW FUNCTION BELOW ---
exports.getPublicTempleById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find temple by ID (make sure visit_price is included)
        const temple = await Temple.findById(id);

        if (!temple) {
            return res.status(404).json({
                success: false,
                message: "Temple not found"
            });
        }

        res.status(200).json({
            success: true,
            data: temple
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching temple details",
            error: error.message
        });
    }
};

//const Membership = require("../../models/Membership"); // Ensure this import is at the top

// ... (existing getPublicStates and getPublicTemples)

exports.getActiveMembershipPlans = async (req, res) => {
    try {
        // Fetch plans where status is 1 (Active)
        const plans = await Membership.find({ status: 1 }).sort({ price: 1 });

        res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching membership plans",
            error: error.message
        });
    }
};