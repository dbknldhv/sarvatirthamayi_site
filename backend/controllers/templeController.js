const Temple = require('../models/Temple');
const State = require('../models/State');
const City = require('../models/City');
const mongoose = require('mongoose');

// 1. Get ALL details for the Temple List Table
exports.getAdminTempleList = async (req, res) => {
    try {
        const temples = await Temple.find()
            .populate('city_id', 'name')
            .populate('state_id', 'name')
            .populate('country_id', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: temples.length,
            temples: temples.map(t => ({
                ...t._doc,
                displayStatus: t.is_free_today ? 'FREE' : (t.is_discount_active ? `${t.member_discount_percentage}% OFF` : 'Standard')
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get Single Temple by MongoDB _id OR numeric sql_id
exports.getTempleById = async (req, res) => {
    try {
        const { id } = req.params;
        let temple;

        // Try lookup by MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            temple = await Temple.findById(id)
                .populate('city_id')
                .populate('state_id')
                .populate('country_id');
        } 
        
        // Fallback to numeric sql_id
        if (!temple && !isNaN(id)) {
            temple = await Temple.findOne({ sql_id: Number(id) })
                .populate('city_id')
                .populate('state_id')
                .populate('country_id');
        }

        if (!temple) return res.status(404).json({ success: false, message: "Temple not found" });
        
        res.status(200).json({ success: true, temple });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Explicit numeric SQL ID lookup (Matches your adminRoutes.js requirement)
exports.getTempleBySqlId = async (req, res) => {
    try {
        const { sqlId } = req.params;
        const temple = await Temple.findOne({ sql_id: Number(sqlId) })
            .populate('city_id')
            .populate('state_id')
            .populate('country_id');

        if (!temple) return res.status(404).json({ success: false, message: "Temple not found" });
        res.status(200).json({ success: true, temple });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Create Temple
exports.createTemple = async (req, res) => {
    try {
        const templeData = { ...req.body };
        if (req.file) {
            templeData.image = req.file.path; 
        }

        // Auto-increment sql_id if creating new records via admin
        const lastTemple = await Temple.findOne().sort({ sql_id: -1 });
        templeData.sql_id = lastTemple && lastTemple.sql_id ? lastTemple.sql_id + 1 : 1;
        
        // Ensure defaults are set if not provided
        templeData.is_free_today = templeData.is_free_today || false;
        templeData.is_discount_active = templeData.is_discount_active || false;

        const newTemple = new Temple(templeData);
        await newTemple.save();
        
        res.status(201).json({ 
            success: true, 
            message: "Temple saved successfully", 
            temple: newTemple 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Update Temple (Supports _id or sql_id)
exports.updateTemple = async (req, res) => {
    try {
        const { id } = req.params;
        let temple;

        if (mongoose.Types.ObjectId.isValid(id)) {
            temple = await Temple.findById(id);
        } else if (!isNaN(id)) {
            temple = await Temple.findOne({ sql_id: Number(id) });
        }

        if (!temple) return res.status(404).json({ success: false, message: "Temple not found" });

        const updateData = { ...req.body };
        if (req.file) {
            updateData.image = req.file.path;
        }

        // Force Boolean conversion for checkboxes from Admin Dashboard
        if (updateData.is_free_today !== undefined) updateData.is_free_today = String(updateData.is_free_today) === 'true';
        if (updateData.is_discount_active !== undefined) updateData.is_discount_active = String(updateData.is_discount_active) === 'true';

        const updated = await Temple.findByIdAndUpdate(
            temple._id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );
        
        res.status(200).json({ success: true, temple: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// --- ADMIN: Quick Toggle (For "One-Click" Dashboard actions) ---
exports.toggleFreeEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { isFree } = req.body; 

        const updatedTemple = await Temple.findByIdAndUpdate(
            id,
            { is_free_today: isFree },
            { new: true }
        );

        res.status(200).json({ 
            success: true, 
            message: `Free entry ${isFree ? 'enabled' : 'disabled'}`,
            temple: updatedTemple 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Delete Temple (Supports _id or sql_id)
exports.deleteTemple = async (req, res) => {
    try {
        const { id } = req.params;
        let temple;

        if (mongoose.Types.ObjectId.isValid(id)) {
            temple = await Temple.findByIdAndDelete(id);
        } else if (!isNaN(id)) {
            temple = await Temple.findOneAndDelete({ sql_id: Number(id) });
        }

        if (!temple) return res.status(404).json({ success: false, message: "Temple not found" });
        
        res.status(200).json({ success: true, message: "Temple deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Metadata: Get ALL States (For Add/Edit Dropdown)
exports.getStates = async (req, res) => {
    try {
        const states = await State.find({ status: 1 }).sort({ name: 1 });
        res.status(200).json({ success: true, states });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Metadata: Get Cities based on State SQL ID (For Dependent Dropdown)
exports.getCitiesByState = async (req, res) => {
    try {
        const { stateSqlId } = req.params;
        const cities = await City.find({ state_id: Number(stateSqlId) }).sort({ name: 1 });
        res.status(200).json({ success: true, cities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Quick List for Select Dropdowns
exports.getTemples = async (req, res) => {
    try {
        const temples = await Temple.find({ status: 1 }).select('name _id').sort({ name: 1 });
        res.status(200).json({ success: true, temples });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};