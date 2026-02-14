const TempleBooking = require("../models/TempleBooking");
const mongoose = require("mongoose");

// @desc Get all temple bookings with filters and pagination
// @route GET /api/admin/temple-bookings
exports.getAllTempleBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = "", 
      bookingStatus, 
      paymentStatus 
    } = req.query;

    const query = {};

    // Search by devotee name or whatsapp
    if (search) {
      query.$or = [
        { devotees_name: { $regex: search, $options: "i" } },
        { whatsapp_number: { $regex: search, $options: "i" } }
      ];
    }

    // Status filters
    if (bookingStatus) query.booking_status = Number(bookingStatus);
    if (paymentStatus) query.payment_status = Number(paymentStatus);

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await TempleBooking.find(query)
      .populate("temple_id", "name image") // Matches your migration
      .populate("user_id", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await TempleBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      templeBookings: bookings,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    console.error("Error in getAllTempleBookings:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Get single booking by ID
// @route GET /api/admin/temple-bookings/:id
exports.getTempleBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    let booking;

    // 1. Check if the ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      booking = await TempleBooking.findById(id)
        .populate("temple_id")
        .populate("user_id");
    } else {
      // 2. If not a valid ObjectId, try searching by numeric sql_id
      // Ensure the field name matches your Schema (e.g., sql_id or booking_id)
      booking = await TempleBooking.findOne({ sql_id: id })
        .populate("temple_id")
        .populate("user_id");
    }

    // 3. Handle cases where no booking is found
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: `Booking not found with ID: ${id}` 
      });
    }

    // 4. Return successful response
    res.status(200).json({ success: true, booking });

  } catch (error) {
    console.error("Fetch Booking Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server Error", 
      error: error.message 
    });
  }
};
// @desc Update Booking Status (MATCHES adminRoutes.js NAME)
// @route PUT /api/admin/temple-bookings/status/:id
exports.updateTempleBookingStatus = async (req, res) => {
  try {
    const { booking_status } = req.body;

    const updatedBooking = await TempleBooking.findByIdAndUpdate(
      req.params.id,
      { booking_status: Number(booking_status), updated_at: new Date() },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      booking: updatedBooking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};