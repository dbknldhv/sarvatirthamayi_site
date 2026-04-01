const Donation = require("../../models/Donation");
const UserDonation = require("../../models/UserDonation");
const User = require("../../models/User");
const mongoose = require("mongoose");

/**
 * 🛠️ IMAGE HELPER
 * Ensures the Flutter app gets a clean, reachable URL.
 */
const formatImageUrl = (imgPath) => {
  if (!imgPath) return "https://api.sarvatirthamayi.com/uploads/default-donation.jpg";
  if (imgPath.startsWith("http")) return imgPath;

  const baseUrl = "https://api.sarvatirthamayi.com/";
  const cleanPath = imgPath.replace(/\\/g, "/");
  return `${baseUrl}${cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath}`;
};

/**
 * 1. Get Donations List (With Pagination)
 */
exports.getDonations = async (req, res) => {
  try {
    const { temple_id, page = 1, per_page = 15 } = { ...req.query, ...req.body };
    const baseUrl = "https://api.sarvatirthamayi.com/";

    let query = { status: 1 };
    if (temple_id) {
      query.temple_id = String(temple_id);
    }

    const limit = parseInt(per_page) || 15;
    const currentPage = parseInt(page) || 1;
    const skip = (currentPage - 1) * limit;

    const [totalCount, donations] = await Promise.all([
      Donation.countDocuments(query),
      Donation.find(query).sort({ sequence: 1 }).skip(skip).limit(limit).lean(),
    ]);

    const formatted = donations.map((d) => ({
      id: Number(d.sql_id) || 1,
      temple_id: Number(d.temple_id) || 0,
      name: d.name || "",
      short_description: d.short_description || "",
      status: Number(d.status) || 1,
      image: formatImageUrl(d.image),
      is_favorite: 0,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Donations fetched successfully",
      data: {
        data: formatted,
        total_count: totalCount,
        is_next: (skip + formatted.length) < totalCount,
        is_prev: currentPage > 1,
        total_pages: Math.ceil(totalCount / limit),
        current_page: currentPage,
        per_page: limit,
        from: formatted.length ? skip + 1 : 0,
        to: skip + formatted.length,
        next_page_url:
          (skip + formatted.length) < totalCount
            ? `${baseUrl}api/v1/donation/index?page=${currentPage + 1}`
            : null,
        prev_page_url:
          currentPage > 1
            ? `${baseUrl}api/v1/donation/index?page=${currentPage - 1}`
            : null,
        path: `${baseUrl}api/v1/donation/index`,
        has_pages: totalCount > limit,
        links: [],
      },
    });
  } catch (error) {
    res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

/**
 * 2. Get Donation Details
 */
exports.getDonationById = async (req, res) => {
  try {
    const { donation_id } = req.body;
    const donation = await Donation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(donation_id) ? donation_id : null },
        { sql_id: Number(donation_id) },
      ],
    }).lean();

    if (!donation) {
      return res.status(404).json({ status: "false", success: false, message: "Donation not found" });
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Donation fetched successfully",
      data: {
        id: Number(donation.sql_id) || 1,
        name: donation.name || "",
        short_description: donation.short_description || "",
        image: formatImageUrl(donation.image),
        is_favorite: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

/**
 * 3. Update Donation
 */
exports.updateDonation = async (req, res) => {
  try {
    const { donation_id } = req.body;
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = `uploads/${req.file.filename}`;
    }

    const updated = await Donation.findOneAndUpdate(
      {
        $or: [
          { _id: mongoose.isValidObjectId(donation_id) ? donation_id : null },
          { sql_id: Number(donation_id) },
        ],
      },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ status: "false", success: false, message: "Donation not found" });
    }

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Donation updated successfully",
      data: {
        id: Number(updated.sql_id) || 1,
        name: updated.name || "",
        image: formatImageUrl(updated.image),
      },
    });
  } catch (error) {
    res.status(500).json({ status: "false", success: false, message: error.message });
  }
};

/**
 * 4. Donation Booking Details
 */
exports.getMyDonationBookings = async (req, res) => {
  try {
    // req.user.id is Mongo ObjectId string from JWT.
    // UserDonation.user_id is Number, so resolve the user's numeric sql_id first.
    const currentUser = await User.findById(req.user.id).lean();

    if (!currentUser) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "User not found",
      });
    }

    const numericUserId = Number(currentUser.sql_id);

    if (!Number.isFinite(numericUserId)) {
      return res.status(400).json({
        status: "false",
        success: false,
        message: "User sql_id is missing or invalid",
      });
    }

    const bookings = await UserDonation.find({ user_id: numericUserId })
      .populate("donation_id", "name description image sql_id")
      .sort({ created_at: -1, _id: -1 })
      .lean();

    const formatted = bookings.map((booking) => ({
      id: Number(booking._id || 0),
      temple_id: Number(booking.temple_id || 0),
      donation_id: Number(booking.donation_id?.sql_id || booking.donation_id || 0),
      payment_status: Number(booking.payment_status || 1),
      donation: booking.donation_id && typeof booking.donation_id === "object"
        ? {
            id: Number(booking.donation_id.sql_id || 0),
            name: String(booking.donation_id.name || ""),
            description: String(booking.donation_id.description || ""),
            image: formatImageUrl(booking.donation_id.image || ""),
            image_thumb: formatImageUrl(booking.donation_id.image || ""),
            is_favorite: 0,
          }
        : null,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Donation booking details fetched successfully.",
      data: {
        data: formatted,
        total_count: formatted.length,
        is_next: false,
        is_prev: false,
        total_pages: 1,
        current_page: 1,
        per_page: formatted.length,
        from: formatted.length ? 1 : 0,
        to: formatted.length,
        next_page_url: null,
        prev_page_url: null,
        path: req.originalUrl,
        has_pages: false,
        links: [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};