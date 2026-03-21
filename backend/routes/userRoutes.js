const express = require("express");
const router = express.Router();

// --- 1. Import Controllers ---
const aboutController = require("../controllers/user/aboutController");
const joinNowController = require("../controllers/user/join-nowController");
const userController = require("../controllers/user/userController");
const cardController = require("../controllers/user/membershipcardController");
const adminMembershipController = require("../controllers/membershipController");
const templeBookingController = require("../controllers/user/templeBookingController");
const ritualController = require("../controllers/user/ritualController");
const userVoucherController = require("../controllers/user/userVoucherController");

// --- 2. Import Middleware ---
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// --- 3. Base & Health Check Routes ---
router.get("/test-route", (req, res) => {
    res.json({ message: "User router is working!" });
});

// --- 4. Public Data Routes (No Auth Required) ---
router.get("/about-data", aboutController.getAboutPageData);
router.get("/states", joinNowController.getPublicStates);
router.get("/temple/index", joinNowController.getPublicTemples);

router.get("/temples", joinNowController.getPublicTemples);
router.get("/temples/:id", joinNowController.getPublicTempleById);
router.get("/temple-assistants/:templeId", userController.getAssistantsByTemple);
router.get("/membership-plans", joinNowController.getActiveMembershipPlans);

// Ritual Metadata
router.get("/rituals", ritualController.getAllRituals); 
router.get("/rituals/types", ritualController.getRitualTypes);
router.get("/rituals/temple/:templeId", ritualController.getRitualsByTemple);
router.get("/rituals/details/:ritualId", ritualController.getRitualDetailsWithPackages);

// --- 5. User Authentication Routes (Public) ---
router.post("/signup", userController.signupUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// --- 6. Protected Routes (Require Token) ---

// Auth Verification
router.get("/auth/check-auth", protect, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

// User Profile
router.get('/profile', protect, userController.getProfile);

/**
 * 🎯 FIX: UPDATE PROFILE 
 * You must include 'protect' here, otherwise 'req.user.id' inside the controller 
 * will be undefined, causing a 500 error.
 */
router.put('/update-profile', protect, upload.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), userController.updateProfile);

router.put('/profile', protect, upload.fields([
    { name: 'profile_picture', maxCount: 1 }
]), userController.updateProfile);

// Voucher Management
router.get("/vouchers/available", protect, userVoucherController.getAvailableVouchers);
router.post("/vouchers/verify", protect, userVoucherController.verifyVoucherForUser);

// Membership & Card Services
router.get('/my-membership', protect, cardController.getMyMembershipCard);
router.post('/card/create-order', protect, cardController.createMembershipOrder);
router.post('/card/verify-payment', protect, cardController.verifyAndActivateMembership);

// Temple Booking Flow
router.post('/book-temple/create-order', protect, templeBookingController.createTempleBookingOrder);
router.post('/book-temple/verify', protect, templeBookingController.verifyAndConfirmBooking);
router.get('/my-temple-bookings', protect, templeBookingController.getMyBookings);

// Ritual Booking Flow
router.post('/rituals/create-order', protect, ritualController.createRitualOrder);
router.post('/rituals/verify-booking', protect, ritualController.verifyRitualBooking);

// Legacy/Additional Actions
router.post('/book-ritual', protect, userController.bookRitual);
router.post('/purchase-membership', protect, userController.purchaseMembership);

module.exports = router;