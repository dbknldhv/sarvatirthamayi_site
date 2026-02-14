const RitualBooking = require("../models/RitualBooking");

// Get all bookings with populated relationships
exports.getAllRitualBookings = async (req, res) => {
  try {
    const bookings = await RitualBooking.find()
      .populate("user_id", "first_name last_name email mobile_number")
      .populate("temple_id", "name")
      .populate("ritual_id", "name")
      .populate("ritual_package_id", "name")
      .sort({ created_at: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single booking detail
exports.getRitualBookingById = async (req, res) => {
  try {
    const booking = await RitualBooking.findById(req.params.id)
      .populate("user_id")
      .populate("temple_id")
      .populate("ritual_id")
      .populate("ritual_package_id");
      
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};