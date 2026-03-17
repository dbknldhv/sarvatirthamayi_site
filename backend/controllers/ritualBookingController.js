/**
 * STM MERN Backend - Admin Ritual Booking Controller
 * Handles the management and retrieval of ritual bookings for the admin panel.
 */

const RitualBooking = require("../models/RitualBooking");

/**
 * 1. Get All Ritual Bookings
 * Fetches every ritual booking in the system with full details for the admin table.
 * Sorted by creation date (newest first).
 */
exports.getAllRitualBookings = async (req, res) => {
    try {
        const bookings = await RitualBooking.find()
            // Populate User info (Adjusted fields based on your latest User model)
            .populate("user_id", "name email mobile_number first_name last_name")
            
            // Populate Temple info including the city
            .populate("temple_id", "name city_name")
            
            // Populate Ritual name and Type
            .populate("ritual_id", "name type")
            
            // Populate Package details to see the selected price point
            .populate("ritual_package_id", "name price")
            
            // Sort by creation date - newest bookings appear at the top
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
 * Fetches the deep-populated data for a specific booking ID.
 * Typically used for the "View Details" modal or specific edit page in Admin.
 */
exports.getRitualBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await RitualBooking.findById(id)
            .populate("user_id") // Full user profile
            .populate("temple_id") // Full temple details
            .populate("ritual_id") // Full ritual details
            .populate("ritual_package_id"); // Full package details (price, duration, etc.)
            
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
 * 3. Update Ritual Booking Status (Recommended addition for Admin)
 * Allows Admin to confirm completion or cancel a booking.
 */
exports.updateRitualBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { booking_status, payment_status } = req.body;

        const updatedBooking = await RitualBooking.findByIdAndUpdate(
            id,
            { 
                booking_status, 
                payment_status,
                updated_at: Date.now() 
            },
            { new: true }
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