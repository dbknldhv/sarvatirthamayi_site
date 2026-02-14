const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Middlewares
const { protectAdmin } = require("../middleware/authMiddleware");

// Controllers (Object Style)
const dashboardController = require("../controllers/dashboardController");
const stateController = require("../controllers/stateController");
const cityController = require('../controllers/cityController');
const countryController = require('../controllers/countryController');
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/userController");
const ritualTypeController = require("../controllers/ritualTypeController");
const ritualBookingController = require("../controllers/ritualBookingController");
const ritualPackageController = require("../controllers/ritualPackageController");
const purchasedCardAdminController = require("../controllers/purchasedCardController");
// Controllers (Destructured Style)
const { 
  getAdminTempleList, 
  getTempleById,
  getTempleBySqlId, 
  createTemple, 
  updateTemple, 
  deleteTemple,
  getStates,           // Re-enabled for data consistency
  getCitiesByState     // New: For dependent dropdowns
} = require('../controllers/templeController');

const { 
  getAllTempleBookings, 
  getTempleBookingById,
  updateTempleBookingStatus,
  //createTempleBooking 
} = require("../controllers/templeBookingController");

const {
  getAllMemberships,
  getMembershipById,
  getTemplesList,
  getActiveMemberships,
  createMembership,
  updateMembership,
  deleteMembership
} = require("../controllers/membershipController");

const { 
  getDonations, 
  getDonationById, 
  createDonation, 
  updateDonation, 
  deleteDonation 
} = require("../controllers/donationController");

const { 
  getRituals,
  getRitualById, 
  createRitual, 
  updateRitual,
  getRitualTypes,
  deleteRitual 
} = require("../controllers/ritualController");

const { createAdmin } = require("../controllers/adminController");
const { sendOtp, resetPassword } = require("../controllers/forgotPassword.controller");

// --- 1. CONFIGURE MULTER STORAGE ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- 2. PUBLIC ROUTES ---
router.post("/login", authController.login);
router.post("/create-admin", createAdmin);
router.post("/forgot-password", sendOtp);
router.post("/reset-password", resetPassword);

// Shared Metadata Routes
router.get("/states", getStates); // Using TempleController for migrated data
router.get("/states/:stateSqlId/cities", getCitiesByState); // NEW: Get cities for a state
router.get('/cities', cityController.getCities);
router.get('/countries', countryController.getCountries);

// --- 3. PROTECTED ADMIN ROUTES ---

// Dashboard
router.get("/dashboard-stats", protectAdmin, dashboardController.getDashboardStats);

// User Management
router.get("/users", protectAdmin, userController.getAllUsers);
router.get("/users/:id", protectAdmin, userController.getUserById);
router.put("/users/update/:id", protectAdmin, userController.updateUser);
router.delete("/users/:id", protectAdmin, userController.deleteUser);

// Temple Management
router.get("/temples", protectAdmin, getAdminTempleList);
router.get("/temples/sql/:sqlId", protectAdmin, getTempleBySqlId);
router.get("/temples/:id", protectAdmin, getTempleById);
router.post("/temples/create", protectAdmin, upload.single('image'), createTemple);
router.put("/temples/update/:id", protectAdmin, upload.single('image'), updateTemple);
router.delete("/temples/:id", protectAdmin, deleteTemple);

// Temple Bookings
router.get("/temple-bookings", protectAdmin, getAllTempleBookings);
router.get("/temple-bookings/:id", protectAdmin, getTempleBookingById);
router.put("/temple-bookings/status/:id", protectAdmin, updateTempleBookingStatus);
//router.post("/temple-bookings", protectAdmin, createTempleBooking);

// Membership Management
router.get("/memberships/temples-list", protectAdmin, getTemplesList);
router.get("/memberships/active", getActiveMemberships);
router.get("/memberships", protectAdmin, getAllMemberships);
router.get("/memberships/:id", protectAdmin, getMembershipById);
router.post("/memberships/create", protectAdmin, createMembership);
router.put("/memberships/update/:id", protectAdmin, updateMembership);
router.delete("/memberships/:id", protectAdmin, deleteMembership);
router.get("/purchased-memberships", protectAdmin, purchasedCardAdminController.getAllPurchasedCardsAdmin);
router.get("/purchased-memberships/:id", protectAdmin, purchasedCardAdminController.getPurchasedCardById);

// Donations
router.get("/donations", protectAdmin, getDonations);
router.get("/donations/:id", protectAdmin, getDonationById);
router.post("/donations", protectAdmin, upload.single('image'), createDonation);
router.put("/donations/update/:id", protectAdmin, upload.single('image'), updateDonation);
router.delete("/donations/:id", protectAdmin, deleteDonation);

// Rituals
router.get("/rituals", protectAdmin, getRituals);
router.get("/ritual-types", protectAdmin, getRitualTypes);
router.get("/rituals/:id", protectAdmin, getRitualById); 
router.post("/rituals", protectAdmin, upload.single('image'), createRitual);
router.put("/rituals/update/:id", protectAdmin, upload.single('image'), updateRitual);
router.delete("/rituals/:id", protectAdmin, deleteRitual); 

// Ritual Types
router.get("/ritual-types", protectAdmin, ritualTypeController.getRitualTypes);
router.get("/ritual-types/:id", protectAdmin, ritualTypeController.getRitualTypeById);
router.post("/ritual-types", protectAdmin, ritualTypeController.createRitualType);
router.put("/ritual-types/:id", protectAdmin, ritualTypeController.updateRitualType);
router.delete("/ritual-types/:id", protectAdmin, ritualTypeController.deleteRitualType);

// Ritual Bookings
router.get("/ritual-bookings", protectAdmin, ritualBookingController.getAllRitualBookings);
router.get("/ritual-bookings/:id", protectAdmin, ritualBookingController.getRitualBookingById);

// Ritual Packages
router.get("/ritual-packages", protectAdmin, ritualPackageController.getRitualPackages);
router.post("/ritual-packages", protectAdmin, ritualPackageController.createRitualPackage);
router.delete("/ritual-packages/:id", protectAdmin, ritualPackageController.deleteRitualPackage);
router.get("/ritual-packages/:id", protectAdmin, ritualPackageController.getRitualPackageById);
router.put("/ritual-packages/:id", protectAdmin, ritualPackageController.updateRitualPackage);

module.exports = router;