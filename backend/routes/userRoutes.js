const express = require("express");
const router = express.Router();

// --- 1. Import Controllers ---
const aboutController = require("../controllers/user/aboutController");
const joinNowController = require("../controllers/user/join-nowController");
const userController = require("../controllers/user/userController");
const cardController = require("../controllers/user/membershipcardController");
const templeBookingController = require("../controllers/user/templeBookingController");
const ritualController = require("../controllers/user/ritualController");
const userVoucherController = require("../controllers/user/userVoucherController");
const homeController = require("../controllers/user/homeController"); // Add this
// const donationController = require("../controllers/user/donationController"); // Uncomment when ready
const donationController = require("../controllers/user/donationController");

// --- 2. Import Middleware ---
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// --- 3. Base & Health Check Routes ---
router.get("/test-route", (req, res) => {
    res.json({ message: "User router is working!" });
});

// --- 4. Public Data Routes ---
router.get("/home", protect, homeController.getHomeData); // Matches Flutter home call
router.get("/about-data", aboutController.getAboutPageData);
router.get("/states", joinNowController.getPublicStates);

// --- 🎯 FLUTTER ALIGNMENT: Temple Public Routes ---
router.get("/temple/index", joinNowController.getPublicTemples); 
router.post("/temple/show", joinNowController.getPublicTempleById); 
router.get("/temples", joinNowController.getPublicTemples);
router.get("/temples/:id", joinNowController.getPublicTempleById);
router.get("/temple-assistants/:templeId", userController.getAssistantsByTemple);


router.post("/donation/index", protect, donationController.getDonationsByTemple);
router.post("/donation/show", protect, donationController.getDonationById);

// --- 🎯 FLUTTER ALIGNMENT: Ritual Public Routes ---
//router.post("/ritual/index", ritualController.getAllRituals); 
router.post("/ritual/index", ritualController.getRitualsByTemple);
router.post("/ritual/show", ritualController.getRitualDetailsWithPackages); 
router.get("/ritual/packages", ritualController.getRitualDetailsWithPackages); // Extra alias for packages

// --- 5. User Authentication (Public) ---
router.post("/signup", userController.signupUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.loginUser);
router.post("/logout", protect, userController.logoutUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// --- 6. Protected Routes (Require Token) ---
router.get("/auth/check-auth", protect, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

router.get('/profile', protect, userController.getProfile);
router.post('/profile', protect, upload.fields([{ name: 'profile_picture', maxCount: 1 }]), userController.updateProfile);

router.put('/update-profile', protect, upload.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), userController.updateProfile);

// --- 🎯 FLUTTER ALIGNMENT: Temple Booking Flow ---
// These are the exact paths from ApiCon in Flutter
router.post("/temple/booking", protect, templeBookingController.createTempleBookingOrder);
router.post("/temple/verify-payment", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/temple/booking-details", protect, templeBookingController.getMyBookings);

// --- 🎯 FLUTTER ALIGNMENT: Ritual Booking Flow ---
router.post("/ritual/booking", protect, ritualController.createRitualOrder);
router.post("/ritual/verify-payment", protect, ritualController.verifyRitualBooking);
router.get("/ritual/booking-details", protect, ritualController.verifyRitualBooking); // Alias for details

// --- 🎯 FLUTTER ALIGNMENT: Membership & Cards ---
router.get('/membership-card/index', protect, cardController.getMyMembershipCard);
router.post('/membership-card/purchase', protect, cardController.createMembershipOrder);
router.post('/membership-card/verify-payment', protect, cardController.verifyAndActivateMembership);

// --- 🎯 FLUTTER ALIGNMENT: Donation Flow (Placeholder) ---
// router.get("/donation/index", donationController.getAllDonations);
// router.post("/donation/show", donationController.getDonationById);
// router.post("/donation/give-donation", protect, donationController.createDonationOrder);

// --- Legacy Routes (Keep for Web support) ---
router.post('/book-temple/create-order', protect, templeBookingController.createTempleBookingOrder);
router.post('/book-temple/verify', protect, templeBookingController.verifyAndConfirmBooking);
router.get('/my-temple-bookings', protect, templeBookingController.getMyBookings);
router.post('/rituals/create-order', protect, ritualController.createRitualOrder);
router.post('/rituals/verify-booking', protect, ritualController.verifyRitualBooking);

module.exports = router;