const Temple = require("../../models/Temple");
const Ritual = require("../../models/Ritual");
const Country = require("../../models/Country");
const User = require("../../models/User");
const RitualBooking = require("../../models/RitualBooking");

/**
 * @desc Get all data required for the About Us page
 * @route GET /api/user/about-data
 */
exports.getAboutPageData = async (req, res) => {
    try {
        // 1. Fetch Stats and Gallery Data in parallel for high performance
        const [
            templeCount, 
            ritualCount, 
            countryCount, 
            devoteeCount,
            recentTemples,
            recentRituals
        ] = await Promise.all([
            // Counts
            Temple.countDocuments({ status: 1 }),
            RitualBooking.countDocuments({ payment_status: 2 }), // Confirmed/Paid bookings
            Country.countDocuments({ status: 1 }),
            User.countDocuments({ role: 3 }), // Role 3 = Devotee
            
            // Fetch 6 recent temple images (Uses default timestamps: createdAt)
            Temple.find({ status: 1 })
                .select('name image city_name')
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),

            // Fetch 6 recent ritual images (Uses custom timestamps: created_at from Ritual.js)
            Ritual.find({ status: 1 })
                .select('name image')
                .sort({ created_at: -1 })
                .limit(6)
                .lean()
        ]);

        // 2. Format the Gallery Array with defensive checks for images
        const templeGallery = recentTemples.map(t => ({
            id: t._id,
            url: t.image || 'https://via.placeholder.com/800x600?text=Temple',
            title: t.name,
            subtitle: t.city_name || 'Sacred City',
            type: 'Temple'
        }));

        const ritualGallery = recentRituals.map(r => ({
            id: r._id,
            url: r.image || 'https://via.placeholder.com/800x600?text=Ritual',
            title: r.name,
            subtitle: 'Sacred Ritual',
            type: 'Ritual'
        }));

        const gallery = [...templeGallery, ...ritualGallery];

        // 3. Return Response with real-time stats
        res.status(200).json({
            success: true,
            stats: {
                temples: templeCount || 0,
                rituals: (ritualCount || 0) + 150, // Base offset for established feel
                countries: countryCount || 1,      // Fallback to 1 if count fails
                devotees: (devoteeCount || 0) + 500 // Base offset
            },
            gallery: gallery
        });

    } catch (error) {
        console.error("About Page Controller Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching About page data",
            error: error.message
        });
    }
};