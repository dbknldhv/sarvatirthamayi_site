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
 * 2. Fetch all memberships
 */
exports.getAllMemberships = async (req, res) => {
    try {
        const memberships = await Membership.find()
            .sort({ createdAt: -1 })
            .populate("temples.templeId", "name");
        res.status(200).json(memberships);
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
            .populate("temples.templeId", "name");
            
        if (!membership) return res.status(404).json({ message: "Membership not found" });
        res.status(200).json(membership);
    } catch (error) {
        res.status(500).json({ message: "Error fetching membership", error: error.message });
    }
};

/**
 * 4. Update/Edit an existing membership
 * Handles mapping from Frontend payload to Mongoose Schema
 */
exports.updateMembership = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // 1. Prepare and Sanitize Data
        const updateData = {
            name: data.name,
            description: data.description,
            price: Number(data.price),
            duration: Number(data.duration),
            visits: Number(data.visits),
            // Convert String labels (Active/Months) to Schema Numbers if necessary
            status: data.status === "Active" ? 1 : (data.status === "Inactive" ? 0 : Number(data.status)),
            duration_type: data.duration_type === "Months" ? 1 : (data.duration_type === "Years" ? 2 : Number(data.duration_type)),
            
            // 2. Map the temples array to match the Schema key 'temples'
            // This converts frontend 'selectedTemples' into the format the DB expects
            temples: (data.selectedTemples || data.temples || []).map(t => ({
                templeId: t.templeId || t._id,
                name: t.name,
                maxVisits: Number(t.maxVisits || 1)
            }))
        };

        // 3. Execute Update
        const updatedCard = await Membership.findByIdAndUpdate(
            id, 
            { $set: updateData }, // $set ensures we overwrite the fields explicitly
            { new: true, runValidators: true }
        ).populate("temples.templeId", "name");

        if (!updatedCard) {
            return res.status(404).json({ message: "Membership card not found" });
        }

        res.status(200).json({ 
            message: "Membership Card Updated Successfully!", 
            data: updatedCard 
        });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(400).json({ message: "Update failed", error: error.message });
    }
};

exports.createMembership = async (req, res) => {
    try {
        console.log("Data received by Backend:", req.body); // Check your terminal!
        const newCard = new Membership(req.body);
        await newCard.save();
        res.status(201).json({ message: "Created Successfully!", data: newCard });
    } catch (error) {
        console.error("DETAILED VALIDATION ERROR:", error.errors); // This tells us the exact field
        res.status(400).json({ 
            message: "Validation Failed", 
            details: error.message 
        });
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