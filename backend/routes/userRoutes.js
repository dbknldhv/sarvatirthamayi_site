const express = require("express");
const router = express.Router();

// --- Controllers ---
const aboutController = require("../controllers/user/aboutController");
const joinNowController = require("../controllers/user/join-nowController");
const userController = require("../controllers/user/userController");
const templeBookingController = require("../controllers/user/templeBookingController");
const ritualController = require("../controllers/user/ritualController");
const homeController = require("../controllers/user/homeController");
const donationController = require("../controllers/user/donationController");
const contactController = require("../controllers/user/contactController");
const termsController = require("../controllers/user/termsController");
const privacyController = require("../controllers/user/privacyController");
const favouriteController = require("../controllers/user/favouriteController");
const offerController = require("../controllers/user/offerController");

// Membership & Card Controllers
const userCardController = require('../controllers/user/userCardController');
const userVoucherController = require('../controllers/user/userVoucherController');
const { 
  getActiveMemberships, 
  purchaseMembershipCard, 
  verifyMembershipPayment, 
  getMyMembershipCard 
} = require("../controllers/user/membershipcardController");

// --- Middleware ---
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Helper: Multipart Handler
const handleProfileUploads = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "banner_image", maxCount: 1 },
  ]);
  uploadFields(req, res, (err) => {
    if (err) return res.status(400).json({ status: "false", success: false, message: err.message });
    next();
  });
};

// --- Routes ---

// Health Check
router.get("/test-route", (req, res) => res.json({ message: "User router is working!" }));

// Authentication
router.post("/signup", userController.signupUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.loginUser);
router.post("/logout", protect, userController.logoutUser);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

// Public / Basic Data
router.post("/contact-us", contactController.contactUs);
router.get("/about-data", aboutController.getAboutPageData);
router.get("/about-us", aboutController.getAboutUs);
router.get("/privacy-policy", privacyController.getPrivacyPolicy);
router.get("/term-condition", termsController.getTermsAndConditions);
router.get("/states", joinNowController.getPublicStates);

// Home & Profile
router.get("/home", protect, homeController.getHomeData);
router.get("/auth/check-auth", protect, (req, res) => res.status(200).json({ success: true, user: req.user }));
router.get("/profile", protect, userController.getProfile);
router.post("/profile", protect, handleProfileUploads, userController.updateProfile);
router.put("/profile", protect, handleProfileUploads, userController.updateProfile);
router.put("/update-profile", protect, handleProfileUploads, userController.updateProfile);

// Membership, Cards & Vouchers
router.get("/membership-card/index", protect, getActiveMemberships);
router.post("/membership-card/purchase", protect, purchaseMembershipCard);
router.post("/membership-card/verify-payment", protect, verifyMembershipPayment);
router.get("/membership-card/my-card", protect, getMyMembershipCard);
router.get("/membership-plans/active", getActiveMemberships);
router.get("/card/my-card", protect, userCardController.getMyCard); // 🎯 Explicit Card Route
router.post("/vouchers/verify", protect, userVoucherController.verifyVoucherForUser);
router.get("/vouchers/available", protect, userVoucherController.getAvailableVouchers);

// Temples, Rituals, Donations
router.get("/temple/index", protect, joinNowController.getPublicTemples);
router.post("/temple/show", protect, joinNowController.getPublicTempleById);
router.get("/temples", joinNowController.getPublicTemples);
router.get("/temples/:id", protect, joinNowController.getPublicTempleById);
router.get("/temple-assistants/:templeId", userController.getAssistantsByTemple);
router.post("/temple/booking", protect, templeBookingController.createTempleBookingOrder);
router.post("/temple/verify-payment", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/temple/booking-details", protect, templeBookingController.getMyBookings);

router.post("/ritual/index", protect, ritualController.getRitualsByTemple);
router.post("/ritual/show", protect, ritualController.getRitualShow);
router.post("/ritual/packages", protect, ritualController.getRitualPackages);
router.post("/ritual/booking", protect, ritualController.createRitualOrder);
router.post("/ritual/verify-payment", protect, ritualController.verifyRitualBooking);
router.get("/ritual/booking-details", protect, ritualController.getMyRitualBookings);

router.post("/donation/index", protect, donationController.getDonations);
router.post("/donation/show", protect, donationController.getDonationById);
router.post("/donation/update", protect, upload.single("image"), donationController.updateDonation);
router.get("/donation/booking-details", protect, donationController.getMyDonationBookings);

// Offer Zone & Favourites
router.get("/offers", protect, offerController.getOffers);
router.get("/offer/index", protect, offerController.getOffers);
router.post("/offer/show", protect, offerController.getOfferById);
router.get("/offers/:id", protect, offerController.getOfferById);
router.post("/favourite", protect, favouriteController.favourite);
router.post("/favorite", protect, favouriteController.favourite);
router.get("/favourite/index", protect, favouriteController.favouriteGet);
router.get("/favorite/index", protect, favouriteController.favouriteGet);
router.get("/favorite/list", protect, favouriteController.favouriteGet);

// Legacy Compatibility
router.post("/book-temple/create-order", protect, templeBookingController.createTempleBookingOrder);
router.post("/book-temple/verify", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/my-temple-bookings", protect, templeBookingController.getMyBookings);
router.post("/rituals/create-order", protect, ritualController.createRitualOrder);
router.post("/rituals/verify-booking", protect, ritualController.verifyRitualBooking);

module.exports = router;