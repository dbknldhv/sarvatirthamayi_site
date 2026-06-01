// controllers/dashboardController.js

const User = require("../models/User");
const Temple = require("../models/Temple");
const Membership = require("../models/Membership");
const Voucher = require("../models/Voucher");
const TempleBooking = require("../models/TempleBooking");
const RitualBooking = require("../models/RitualBooking");
const Setting = require("../models/Setting"); // 🎯 FIX: Added Setting model import

/**
 * @desc    Get Comprehensive Admin Dashboard Metrics
 * @route   GET /api/admin/dashboard-stats
 * @access  Private (Admin Only)
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Execute all count queries in parallel for high performance
        const [
            totalUsers,
            sovereignMembers,
            templeCount,
            membershipPlans,
            activeVouchers,
            templeBookings,
            ritualBookings,
            pendingRituals
        ] = await Promise.all([
            // 1. User Metrics (Devotees vs Authorized Members)
            User.countDocuments({ user_type: 3 }), 
            User.countDocuments({ user_type: 3, status: 1, membership: "active" }),

            // 2. Metadata Metrics
            Temple.countDocuments(),
            Membership.countDocuments(),
            Voucher.countDocuments({ status: 1 }),

            // 3. Transaction Metrics (PAID Status)
            TempleBooking.countDocuments({ payment_status: 2 }),
            RitualBooking.countDocuments({ payment_status: 2 }),
            
            // 4. Operational Metrics (Paid but not yet performed)
            RitualBooking.countDocuments({ booking_status: 1, payment_status: 2 })
        ]);

        res.status(200).json({
            success: true,
            message: "Spiritual metrics synchronized successfully",
            data: {
                totalUsers,
                sovereignMembers,
                templeCount,
                membershipPlans,
                activeVouchers,
                templeBookings,
                ritualBookings,
                pendingRituals
            }
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to synchronize dashboard metrics",
            error: error.message
        });
    }
};

/**
 * @desc    Update Global Discount Settings
 * @route   PUT /api/admin/settings/global-discount
 * @access  Private (Admin Only)
 */
exports.updateGlobalSettings = async (req, res) => {
    try {
        const { ritualDiscountRate } = req.body;

        if (ritualDiscountRate === undefined) {
            return res.status(400).json({ success: false, message: "Discount rate is required" });
        }

        // 1. Look for the settings document (there should only ever be one)
        let settings = await Setting.findOne();

        // 2. If it doesn't exist yet (first time running), create it
        if (!settings) {
            settings = await Setting.create({ ritualDiscountRate });
        } else {
            // 3. If it exists, update it and save
            settings.ritualDiscountRate = ritualDiscountRate;
            await settings.save();
        }

        res.status(200).json({
            success: true,
            message: `Global Membership Discount permanently updated to ${ritualDiscountRate}%`,
            data: settings
        });
    } catch (error) {
        console.error("Settings Update Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};