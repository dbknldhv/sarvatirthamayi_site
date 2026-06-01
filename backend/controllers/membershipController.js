const Temple = require("../models/Temple");
const Membership = require("../models/Membership");

/**
 * 1. Fetch only IDs and Names for the dropdown
 */
exports.getTemplesList = async (req, res) => {
    try {
        const temples = await Temple.find({}, "name _id").lean();
        res.status(200).json(temples);
    } catch (error) {
        console.error("Error in getTemplesList:", error);
        res.status(500).json({ message: "Error fetching temples", error: error.message });
    }
};

/**
 * 2. Get All Memberships (Admin)
 */
exports.getAllMemberships = async (req, res) => {
    try {
        const memberships = await Membership.find()
            .sort({ created_at: -1 })
            .lean();
        return res.status(200).json(memberships);
    } catch (error) {
        res.status(500).json({ message: "Error fetching memberships", error: error.message });
    }
};

/**
 * 3. Fetch Single Membership by ID
 */
exports.getMembershipById = async (req, res) => {
    try {
        const membership = await Membership.findById(req.params.id)
            .populate("temples.temple_id", "name"); // 🎯 FIX: Matches your schema's 'temple_id'
            
        if (!membership) return res.status(404).json({ message: "Membership not found" });
        res.status(200).json(membership);
    } catch (error) {
        res.status(500).json({ message: "Error fetching membership", error: error.message });
    }
};

/**
 * 4. Update/Edit an existing membership
 */
exports.updateMembership = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const updateData = {
            name: data.name,
            description: data.description,
            price: Number(data.price),
            duration: Number(data.duration),
            visits: Number(data.visits),
            total_visits: Number(data.total_visits || 0), // 🎯 FIX: Added the new global limit
            
            status: data.status === "Active" ? 1 : (data.status === "Inactive" ? 0 : Number(data.status)),
            duration_type: data.duration_type === "Months" ? 1 : (data.duration_type === "Years" ? 2 : Number(data.duration_type)),
            
            temples: (data.selectedTemples || data.temples || []).map(t => ({
                temple_id: t.temple_id || t.templeId || t._id, // 🎯 FIX: Safe fallback mapping
                temple_name: t.name || t.temple_name,
                max_visits: Number(t.max_visits || t.maxVisits || 1)
            }))
        };

        const updatedCard = await Membership.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { returnDocument: 'after', runValidators: true } // 🎯 FIX: Mongoose Deprecation Warning
        ).populate("temples.temple_id", "name");

        if (!updatedCard) {
            return res.status(404).json({ message: "Membership card not found" });
        }

        res.status(200).json({ message: "Membership Card Updated Successfully!", data: updatedCard });
    } catch (error) {
        res.status(400).json({ message: "Update failed", error: error.message });
    }
};

/**
 * 5. Create new membership
 */
exports.createMembership = async (req, res) => {
    try {
        const newCard = new Membership(req.body);
        await newCard.save();
        res.status(201).json({ message: "Created Successfully!", data: newCard });
    } catch (error) {
        res.status(400).json({ message: "Validation Failed", details: error.message });
    }
};

/**
 * 6. Delete a membership card
 */
exports.deleteMembership = async (req, res) => {
    try {
        const deletedCard = await Membership.findByIdAndDelete(req.params.id);
        if (!deletedCard) return res.status(404).json({ message: "Not found" });
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting card", error: error.message });
    }
};

/**
 * 7. Fetch Active Memberships for User Side
 */
exports.getActiveMemberships = async (req, res) => {
    try {
        const activePlans = await Membership.find({ status: 1 }).sort({ price: 1 });
        res.status(200).json({ success: true, data: activePlans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};