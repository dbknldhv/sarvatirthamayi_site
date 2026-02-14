const User = require("../models/User");
const Temple = require("../models/Temple");
const Membership = require("../models/Membership"); // Adjust model names as per your files
const Donation = require("../models/Donation");

exports.getDashboardStats = async (req, res) => {
  try {
    // Run all counts in parallel for speed
    const [userCount, templeCount, membershipCount, donationCount] = await Promise.all([
      User.countDocuments({ user_type: 3 }), // Regular users
      Temple.countDocuments(),
      Membership.countDocuments(),
      Donation.countDocuments()
    ]);

    res.status(200).json({
      success : true,
      data: {
      users: userCount,
      temples: templeCount,
      memberships: membershipCount,
      donations: donationCount
      }
    });
  } catch (error) 
  {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    error : error.message });
  }
};