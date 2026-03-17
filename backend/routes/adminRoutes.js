const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// 🛡️ Middlewares
const { protect, adminOnly } = require("../middleware/authMiddleware");

// 🎮 Controller Imports
const dashboardController = require("../controllers/dashboardController");
const cityController = require('../controllers/cityController');
const countryController = require('../controllers/countryController');
const authController = require("../controllers/auth.controller");

/**
 * 🎯 FIX 1: Corrected path for userController
 * Based on your folder structure: D:\stm-mern\backend\controllers\user\userController.js
 */
//const userController = require("../controllers/user/userController");

const ritualTypeController = require("../controllers/ritualTypeController");
const ritualBookingController = require("../controllers/ritualBookingController");
const ritualPackageController = require("../controllers/ritualPackageController");
const purchasedCardAdminController = require("../controllers/purchasedCardController");
const voucherController = require("../controllers/voucherController");
const templeController = require('../controllers/templeController');
const templeBookingController = require("../controllers/templeBookingController");
const membershipController = require("../controllers/membershipController");
const donationController = require("../controllers/donationController");
const ritualController = require("../controllers/ritualController");
const adminController = require("../controllers/adminController");
const forgotPasswordController = require("../controllers/forgotPassword.controller");
const userController = require("../controllers/userController");

// --- 1. CONFIGURE MULTER STORAGE ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 2. PUBLIC ADMIN ROUTES ---
router.post("/login", authController.login);
router.post("/create-admin", adminController.createAdmin);
router.post("/forgot-password", forgotPasswordController.sendOtp);
router.post("/reset-password", forgotPasswordController.resetPassword);

// Shared Metadata
router.get("/states", templeController.getStates);
router.get("/states/:stateSqlId/cities", templeController.getCitiesByState);
router.get('/cities', cityController.getCities);
router.get('/countries', countryController.getCountries);

// --- 3. PROTECTED ADMIN ROUTES ---
router.use(protect); 
//router.use(adminOnly);

// --- Dashboard & Global Control ---
router.get("/dashboard-stats", dashboardController.getDashboardStats);
router.put("/settings/global-discount", dashboardController.updateGlobalSettings);

// --- User Management ---
/**
 * 🎯 FIX 2: These routes will now work because userController is correctly imported above
 */
router.get("/users", userController.getAllUsers);
router.get("/users/:id", userController.getUserById);
router.put("/users/update/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);

// --- Temple Management ---
router.get("/temples", templeController.getAdminTempleList);
router.get("/temples/:id", templeController.getTempleById);
router.post("/temples/create", upload.single('image'), templeController.createTemple);
router.put("/temples/update/:id", upload.single('image'), templeController.updateTemple);
router.delete("/temples/:id", templeController.deleteTemple);

// --- Temple Bookings ---
router.get("/temple-bookings", templeBookingController.getAllTempleBookings);
router.put("/temple-bookings/status/:id", templeBookingController.updateTempleBookingStatus);

// --- Membership Management ---
router.get("/memberships", membershipController.getAllMemberships);
router.post("/memberships/create", membershipController.createMembership);
router.put("/memberships/update/:id", membershipController.updateMembership);
router.delete("/memberships/:id", membershipController.deleteMembership);
router.get("/purchased-memberships", purchasedCardAdminController.getAllPurchasedCardsAdmin);

// --- Ritual Management ---
router.get("/rituals", ritualController.getRituals);
router.post("/rituals", upload.single('image'), ritualController.createRitual);
router.put("/rituals/update/:id", upload.single('image'), ritualController.updateRitual);
router.delete("/rituals/:id", ritualController.deleteRitual); 

// --- Ritual Metadata ---
router.get("/ritual-types", ritualTypeController.getRitualTypes);
router.post("/ritual-types", ritualTypeController.createRitualType);
router.get("/ritual-packages", ritualPackageController.getRitualPackages);
router.post("/ritual-packages", ritualPackageController.createRitualPackage);

// --- Ritual Bookings ---
router.get("/ritual-bookings", ritualBookingController.getAllRitualBookings);
router.get("/ritual-bookings/:id", ritualBookingController.getRitualBookingById);

// --- Vouchers & Coupons ---
router.get("/vouchers", voucherController.getVouchers);
router.post("/vouchers/create", voucherController.createVoucher);
router.put("/vouchers/update/:id", voucherController.updateVoucher);
router.delete("/vouchers/:id", voucherController.deleteVoucher);
router.get("/vouchers/download/:id", voucherController.downloadVoucherLeaflet);

module.exports = router;