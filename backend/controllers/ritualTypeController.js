const RitualType = require('../models/RitualType');
const mongoose = require('mongoose');

// Get all Ritual Types
exports.getRitualTypes = async (req, res) => {
    try {
        const types = await RitualType.find({ status: 1 }).sort({ name: 1 }).lean();
        res.status(200).json({ 
            success: true, 
            count: types.length, 
            data: types 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single Ritual Type by ID (Supports ObjectId and sql_id)
exports.getRitualTypeById = async (req, res) => {
    try {
        const { id } = req.params;
        let type;

        // 1. Try finding by native MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            type = await RitualType.findById(id).lean();
        }

        // 2. Fallback to numeric sql_id if not found
        if (!type && !isNaN(id)) {
            type = await RitualType.findOne({ sql_id: Number(id) }).lean();
        }

        if (!type) {
            return res.status(404).json({ success: false, message: "Ritual Type not found" });
        }

        res.status(200).json({ success: true, data: type });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.createRitualType = async (req, res) => {
    try {
        const { name, status } = req.body;
        
        // Auto-generate a simple sql_id by counting existing docs (optional)
        const count = await RitualType.countDocuments();
        
        const newType = new RitualType({
            name,
            status: status ?? 1,
            sql_id: count + 1 
        });

        await newType.save();
        res.status(201).json({ success: true, data: newType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Ritual Type
exports.updateRitualType = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedType = await RitualType.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedType) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.status(200).json({ success: true, data: updatedType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Ritual Type
exports.deleteRitualType = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await RitualType.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};