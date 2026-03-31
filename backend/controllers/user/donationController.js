// controllers/user/donationController.js
const Donation = require("../../models/Donation");
const mongoose = require("mongoose");

/**
 * 🛠️ IMAGE HELPER
 */
const formatImageUrl = (imgPath) => {
    if (!imgPath) return "https://stm.widgetwing.com/storage/temple_images/22/1753369663.jpg";
    if (imgPath.startsWith('http')) return imgPath;
    const baseUrl = "https://api.sarvatirthamayi.com/";
    const cleanPath = imgPath.replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
};

/**
 * 1. Get Donations List (With Pagination)
 * Matches Flutter: DonationResponseEvent
 */
exports.getDonations = async (req, res) => {
    try {
        const { temple_id, page = 1, per_page = 15 } = { ...req.body, ...req.query };
        const baseUrl = "https://api.sarvatirthamayi.com/";

        let query = { status: 1 };
        if (temple_id) {
            query.temple_id = temple_id; // Matches your schema type: String
        }

        const limit = parseInt(per_page);
        const skip = (parseInt(page) - 1) * limit;

        const [totalCount, donations] = await Promise.all([
            Donation.countDocuments(query),
            Donation.find(query).sort({ sequence: 1 }).skip(skip).limit(limit).lean()
        ]);

        const formatted = donations.map(d => ({
            id: d.sql_id || 1, // Fallback to 1 if sql_id is missing
            temple_id: parseInt(d.temple_id) || 0,
            name: d.name || "",
            short_description: d.short_description || "",
            status: d.status || 1,
            image: formatImageUrl(d.image),
            is_favorite: 0
        }));

        // 🎯 EXACT mapping for donation_model.dart -> factory Data.fromJson
        return res.status(200).json({
            status: "true",
            success: true,
            message: "Donations fetched successfully", // Matches Constants.donationSuccessMsg
            data: {
                data: formatted,
                total_count: totalCount,
                is_next: (skip + formatted.length) < totalCount,
                is_prev: parseInt(page) > 1,
                total_pages: Math.ceil(totalCount / limit),
                current_page: parseInt(page),
                per_page: limit,
                from: skip + 1,
                to: skip + formatted.length,
                next_page_url: (skip + formatted.length) < totalCount ? `${baseUrl}api/v1/donation/index?page=${parseInt(page) + 1}` : null,
                prev_page_url: parseInt(page) > 1 ? `${baseUrl}api/v1/donation/index?page=${parseInt(page) - 1}` : null,
                path: `${baseUrl}api/v1/donation/index`,
                has_pages: totalCount > limit,
                links: []
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};

/**
 * 2. Get Donation Details
 * Matches Flutter: DonationShowResponseEvent
 */
exports.getDonationById = async (req, res) => {
    try {
        const { donation_id } = req.body;
        const donation = await Donation.findOne({ 
            $or: [{ _id: donation_id }, { sql_id: Number(donation_id) }] 
        }).lean();

        if (!donation) {
            return res.status(404).json({ status: "false", message: "Donation not found" });
        }

        res.status(200).json({
            status: "true",
            success: true,
            message: "Donation fetched successfully", // Matches Constants.donationShowSuccessMsg
            data: {
                id: donation.sql_id || 1,
                name: donation.name || "",
                short_description: donation.short_description || "",
                image: formatImageUrl(donation.image),
                is_favorite: 0
            }
        });
    } catch (error) {
        res.status(500).json({ status: "false", message: error.message });
    }
};