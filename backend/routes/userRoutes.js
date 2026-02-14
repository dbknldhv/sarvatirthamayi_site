
const express = require("express");
const router = express.Router();


router.get("/test-route", (req, res) => {
    res.json({ message: "User router is working!" });
});

// Import Controllers
const aboutController = require("../controllers/user/aboutController");
const joinNowController = require("../controllers/user/join-nowController");
const userController = require("../controllers/user/userController");
const cardController = require("../controllers/user/membershipcardController");
const adminMembershipController = require("../controllers/membershipController");
const templeBookingController = require("../controllers/user/templeBookingController");
const userMembershipController = require("../controllers/user/userMembershipController");
const ritualController = require("../controllers/user/ritualController");

// Import Middleware
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// --- Auth Check ---
router.get("/auth/check-auth", protect, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// --- 1. Public Data Routes ---
router.get("/about-data", aboutController.getAboutPageData);
router.get("/states", joinNowController.getPublicStates);
router.get("/temples", joinNowController.getPublicTemples);
router.get("/temples/:id", joinNowController.getPublicTempleById);

router.get("/rituals", ritualController.getAllRituals); 
router.get("/rituals/temple/:templeId", ritualController.getRitualsByTemple);
router.get("/rituals/details/:ritualId", ritualController.getRitualDetailsWithPackages);
router.get("/ritual-types", ritualController.getRitualTypes);
// --- 7. Ritual Booking Routes ---
router.post('/rituals/create-order', protect, ritualController.createRitualOrder);
router.post('/rituals/verify-booking', protect, ritualController.verifyRitualBooking);

router.get("/membership-plans", joinNowController.getActiveMembershipPlans);
router.get("/temple-assistants/:templeId", userController.getAssistantsByTemple);


// --- 2. Auth Routes ---
router.post("/signup", userController.signupUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// --- 4. Membership Card Routes ---
router.get('/my-membership', protect, cardController.getMyMembershipCard);

// --- 3. Protected User Routes ---
router.get('/profile', protect, userController.getProfile);
router.put('/update-profile', protect, upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
  ]), userController.updateProfile 
);

// --- 4. Membership Card Routes ---
router.get('/my-membership', protect, cardController.getMyMembershipCard);
router.post('/card/create-order', protect, cardController.createMembershipOrder);
router.post('/card/verify-payment', protect, cardController.verifyAndActivateMembership);
router.get('/card/my-card', protect, cardController.getMyMembershipCard);
//router.get("/membership-plans", userMembershipController.getAvailablePlans);

// --- 5. Temple Booking Routes ---
// PHASE 1: Create Order
router.post('/book-temple/create-order', protect, templeBookingController.createTempleBookingOrder);

// PHASE 2: Verify & Finalize (Handles DB, PDF, and Email)
router.post('/book-temple/verify', protect, templeBookingController.verifyAndConfirmBooking);

// Fetching Bookings
router.get('/my-temple-bookings', protect, templeBookingController.getMyBookings);
router.get('/my-temple-bookings/:id', protect, templeBookingController.getMyBookingById);

// --- 6. Additional Actions ---
router.post('/book-ritual', protect, userController.bookRitual);
router.post('/purchase-membership', protect, userController.purchaseMembership);
router.get("/admin/membership-plans", adminMembershipController.getAllMemberships);

module.exports = router;