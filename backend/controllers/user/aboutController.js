const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Country = require("../../models/Country");
const User = require("../../models/User");
const RitualBooking = require("../../models/RitualBooking");

/**
 * @desc Get all data required for the rich About page
 * @route GET /api/v1/about-data
 */
exports.getAboutPageData = async (req, res) => {
  try {
    const [
      templeCount,
      ritualCount,
      countryCount,
      devoteeCount,
      recentTemples,
      recentRituals,
    ] = await Promise.all([
      Temple.countDocuments({ status: 1 }),
      RitualBooking.countDocuments({ payment_status: 2 }),
      Country.countDocuments({ status: 1 }),
      User.countDocuments({ role: 3 }),

      Temple.find({ status: 1 })
        .select("name image city_name")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      Ritual.find({ status: 1 })
        .select("name image")
        .sort({ created_at: -1 })
        .limit(6)
        .lean(),
    ]);

    const templeGallery = recentTemples.map((t) => ({
      id: t._id,
      url: t.image || "https://via.placeholder.com/800x600?text=Temple",
      title: t.name || "",
      subtitle: t.city_name || "Sacred City",
      type: "Temple",
    }));

    const ritualGallery = recentRituals.map((r) => ({
      id: r._id,
      url: r.image || "https://via.placeholder.com/800x600?text=Ritual",
      title: r.name || "",
      subtitle: "Sacred Ritual",
      type: "Ritual",
    }));

    const gallery = [...templeGallery, ...ritualGallery];

    return res.status(200).json({
      success: true,
      stats: {
        temples: templeCount || 0,
        rituals: (ritualCount || 0) + 150,
        countries: countryCount || 1,
        devotees: (devoteeCount || 0) + 500,
      },
      gallery,
    });
  } catch (error) {
    console.error("About Page Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching About page data",
      error: error.message,
    });
  }
};

/**
 * @desc Get simple About Us content for Flutter app
 * @route GET /api/v1/about-us
 */
exports.getAboutUs = async (req, res) => {
  try {
    return res.status(200).json({
      status: "true",
      message: "Success",
      data: {
        about:
          "Sarvatirthamayi is a spiritual platform dedicated to connecting devotees with temples, rituals, sacred journeys, and devotional services through a seamless digital experience.",
        vision:
          "To make divine experiences accessible to every devotee by bringing temples, rituals, and spiritual services onto one trusted technology platform.",
        mission:
          "Our mission is to provide reliable temple services, ritual booking, donations, memberships, and devotional support with simplicity, trust, and devotion.",
        team:
          "Our team is committed to serving devotees with faith, dedication, and technical excellence to build a spiritually meaningful and user-friendly ecosystem.",
      },
    });
  } catch (error) {
    console.error("About Us Controller Error:", error);
    return res.status(500).json({
      status: "false",
      message: "Something went wrong",
      data: null,
    });
  }
};