/**
 * STM MERN Backend - Admin Ritual Booking Controller
 * Handles the management and retrieval of ritual bookings for the admin panel.
 */

const RitualBooking = require("../models/RitualBooking");
const mongoose = require("mongoose");

/**
 * 1. Get All Ritual Bookings
 */
exports.getAllRitualBookings = async (req, res) => {
    try {
        const bookings = await RitualBooking.find()
            .populate("user_id", "name email mobile_number first_name last_name")
            .populate("temple_id", "name city_name")
            .populate("ritual_id", "name type")
            .populate("ritual_package_id", "name price")
            .sort({ created_at: -1 });

        res.status(200).json({ 
            success: true, 
            count: bookings.length,
            data: bookings 
        });
    } catch (error) {
        console.error("Admin GetAllRitualBookings Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch bookings: " + error.message 
        });
    }
};

/**
 * 2. Get Single Ritual Booking Details
 */
exports.getRitualBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        let booking;

        // Try Object ID first
        if (mongoose.Types.ObjectId.isValid(id)) {
            booking = await RitualBooking.findById(id)
                .populate("user_id") 
                .populate("temple_id") 
                .populate("ritual_id") 
                .populate("ritual_package_id");
        }
        
        // Fallback to SQL ID for legacy data
        if (!booking && !isNaN(id)) {
            booking = await RitualBooking.findOne({ sql_id: Number(id) })
                .populate("user_id") 
                .populate("temple_id") 
                .populate("ritual_id") 
                .populate("ritual_package_id");
        }
            
        if (!booking) {
            return res.status(404).json({ 
                success: false, 
                message: "Ritual booking record not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: booking 
        });
    } catch (error) {
        console.error("Admin GetRitualBookingById Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error retrieving booking detail: " + error.message 
        });
    }
};

/**
 * 3. Update Ritual Booking Status
 */
exports.updateRitualBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { booking_status, payment_status } = req.body;
        let updateTargetId = id;

        // If the ID passed isn't a mongoose ID, we must find the internal _id first
        if (!mongoose.Types.ObjectId.isValid(id) && !isNaN(id)) {
            const existingBooking = await RitualBooking.findOne({ sql_id: Number(id) });
            if (!existingBooking) return res.status(404).json({ success: false, message: "Booking not found" });
            updateTargetId = existingBooking._id;
        }

        const updatedBooking = await RitualBooking.findByIdAndUpdate(
            updateTargetId,
            { 
                booking_status, 
                payment_status,
                updated_at: Date.now() 
            },
            { returnDocument: 'after', runValidators: true } // ✅ Fixed Deprecation Warning
        );

        if (!updatedBooking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Booking status updated successfully",
            data: updatedBooking 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};