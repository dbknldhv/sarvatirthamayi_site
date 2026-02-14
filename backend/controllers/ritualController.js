const Ritual = require('../models/Ritual');
const RitualType = require('../models/RitualType');
const Temple = require('../models/Temple');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Helper to format image URL
const formatImageUrl = (req, imagePath) => {
    if (imagePath && !imagePath.startsWith('http')) {
        return `${req.protocol}://${req.get('host')}${imagePath}`;
    }
    return imagePath;
};

// --- RITUAL CRUD ---

exports.getRituals = async (req, res) => {
    try {
        let query = {};
        if (req.originalUrl.includes('/api/v1')) query.status = 1;

        // Simplified: Using native populate since temple_id is now an ObjectId
        const rituals = await Ritual.find(query)
            .populate('temple_id', 'name')
            .populate('ritual_type_id', 'name') 
            .sort({ sequence: 1 })
            .lean();

        const dataWithFullUrls = rituals.map(ritual => {
            return {
                ...ritual,
                image: formatImageUrl(req, ritual.image),
                // Directly access populated names
                temple_name: ritual.temple_id ? ritual.temple_id.name : 'N/A',
                type_name: ritual.ritual_type_id ? ritual.ritual_type_id.name : 'N/A'
            };
        });

        res.status(200).json({ success: true, count: rituals.length, data: dataWithFullUrls });
    } catch (error) {
        console.error("Get Rituals Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRitualById = async (req, res) => {
    try {
        const { id } = req.params;
        let ritual;

        // 1. Check if the provided ID is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            ritual = await Ritual.findById(id)
                .populate('temple_id', 'name')
                .populate('ritual_type_id', 'name')
                .lean();
        } 
        
        // 2. If not found by _id, try searching by the numeric sql_id
        if (!ritual && !isNaN(id)) {
            ritual = await Ritual.findOne({ sql_id: Number(id) })
                .populate('temple_id', 'name')
                .populate('ritual_type_id', 'name')
                .lean();
        }

        if (!ritual) {
            return res.status(404).json({ success: false, message: "Ritual not found" });
        }

        const ritualObj = {
            ...ritual,
            image: formatImageUrl(req, ritual.image),
            temple_name: ritual.temple_id ? ritual.temple_id.name : 'N/A',
            type_name: ritual.ritual_type_id ? ritual.ritual_type_id.name : 'N/A'
        };

        res.status(200).json({ success: true, data: ritualObj });
    } catch (error) {
        console.error("GetRitualById Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.createRitual = async (req, res) => {
    try {
        const data = { ...req.body };

        // 1. Handle Image Upload
        if (req.file) {
            data.image = `/uploads/${req.file.filename}`;
        }

        // 2. Sanitize Relationships
        // Prevents "CastError" if frontend sends empty strings for IDs
        if (data.ritual_type_id === "" || data.ritual_type_id === "null") {
            data.ritual_type_id = null;
        }

        // 3. Optional: Auto-generate next sql_id
        // This keeps your numeric sequence going for new records
        const lastRitual = await Ritual.findOne().sort({ sql_id: -1 });
        data.sql_id = lastRitual && lastRitual.sql_id ? lastRitual.sql_id + 1 : 1;

        // 4. Create the document
        const ritual = await Ritual.create(data);

        res.status(201).json({ 
            success: true, 
            message: "Ritual created successfully",
            data: ritual 
        });
    } catch (error) {
        console.error("Create Ritual Error:", error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};
/**
 * UPDATED: updateRitual
 * Supports lookup by MongoDB ObjectId or legacy numeric sql_id
 */
exports.updateRitual = async (req, res) => {
    try {
        const { id } = req.params;
        let ritual;

        // 1. Try finding by ObjectId if valid
        if (mongoose.Types.ObjectId.isValid(id)) {
            ritual = await Ritual.findById(id);
        }
        
        // 2. Fallback to numeric sql_id if not found and input is a number
        if (!ritual && !isNaN(id)) {
            ritual = await Ritual.findOne({ sql_id: Number(id) });
        }

        if (!ritual) {
            return res.status(404).json({ success: false, message: "Ritual not found" });
        }

        const updateData = { ...req.body };

        // Data Sanitization for ritual_type_id
        if (updateData.ritual_type_id === "" || updateData.ritual_type_id === "null") {
            updateData.ritual_type_id = null;
        }
        
        // Handle Image Replacement logic
        if (req.file) {
            if (ritual.image && !ritual.image.startsWith('http')) {
                const oldPath = path.join(__dirname, '..', ritual.image);
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (err) {}
                }
            }
            updateData.image = `/uploads/${req.file.filename}`;
        }

        // Always update using the internal MongoDB _id for precision
        const updated = await Ritual.findByIdAndUpdate(
            ritual._id, 
            updateData, 
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error("Update Ritual Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * UPDATED: deleteRitual
 * Supports lookup by MongoDB ObjectId or legacy numeric sql_id
 */
exports.deleteRitual = async (req, res) => {
    try {
        const { id } = req.params;
        let ritual;

        if (mongoose.Types.ObjectId.isValid(id)) {
            ritual = await Ritual.findById(id);
        }
        
        if (!ritual && !isNaN(id)) {
            ritual = await Ritual.findOne({ sql_id: Number(id) });
        }

        if (!ritual) {
            return res.status(404).json({ success: false, message: "Ritual not found" });
        }

        // Clean up image file if it exists locally
        if (ritual.image && !ritual.image.startsWith('http')) {
            const imagePath = path.join(__dirname, '..', ritual.image);
            if (fs.existsSync(imagePath)) {
                try { fs.unlinkSync(imagePath); } catch (err) {}
            }
        }

        await ritual.deleteOne();
        res.status(200).json({ success: true, message: "Ritual deleted successfully" });
    } catch (error) {
        console.error("Delete Ritual Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRitualTypes = async (req, res) => {
    try {
        const types = await RitualType.find({ status: 1 }).sort({ name: 1 });
        res.status(200).json({ success: true, data: types });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};