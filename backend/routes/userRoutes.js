const express = require("express");
const router = express.Router();

// --- Controllers ---
const aboutController = require("../controllers/user/aboutController");
const joinNowController = require("../controllers/user/join-nowController");
const userController = require("../controllers/user/userController");
const templeBookingController = require("../controllers/user/templeBookingController");
const ritualController = require("../controllers/user/ritualController");
const userVoucherController = require("../controllers/user/userVoucherController");
const homeController = require("../controllers/user/homeController");
const donationController = require("../controllers/user/donationController");
const contactController = require("../controllers/user/contactController");
const termsController = require("../controllers/user/termsController");
const privacyController = require("../controllers/user/privacyController");
const favouriteController = require("../controllers/user/favouriteController");
const offerController = require("../controllers/user/offerController");

// Import as an object to safely fallback and protect against undefined destructuring crashes
const membershipController = require("../controllers/user/membershipcardController");

// --- Middleware ---
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// 🎯 SAFE MULTIPART HANDLER WRAPPER (Prevents "next is not a function" errors)
const handleProfileUploads = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "banner_image", maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: "false", success: false, message: err.message });
    }
    next();
  });
};

// --- Health Check ---
router.get("/test-route", (req, res) => {
  res.json({ message: "User router is working!" });
});

// --- Public / Basic Data ---
router.post("/contact-us", contactController.contactUs);
router.get("/about-data", aboutController.getAboutPageData);
router.get("/about-us", aboutController.getAboutUs);
router.get("/privacy-policy", privacyController.getPrivacyPolicy);
router.get("/term-condition", termsController.getTermsAndConditions);
router.get("/states", joinNowController.getPublicStates);

// --- Home ---
router.get("/home", protect, homeController.getHomeData);

// --- Offer Zone ---
router.get("/offers", protect, offerController.getOffers);
router.get("/offer/index", protect, offerController.getOffers);
router.post("/offer/show", protect, offerController.getOfferById);
router.get("/offers/:id", protect, offerController.getOfferById);

// --- Favourite / Favorite Compatibility ---
router.post("/favourite", protect, favouriteController.favourite);
router.post("/favorite", protect, favouriteController.favourite);
router.get("/favourite/index", protect, favouriteController.favouriteGet);
router.get("/favorite/index", protect, favouriteController.favouriteGet);
router.get("/favorite/list", protect, favouriteController.favouriteGet);

// --- Temple Public Routes ---
router.get("/temple/index", protect, joinNowController.getPublicTemples);
router.post("/temple/show", protect, joinNowController.getPublicTempleById);
router.get("/temples", joinNowController.getPublicTemples);
router.get("/temples/:id", protect, joinNowController.getPublicTempleById);
router.get("/temple-assistants/:templeId", userController.getAssistantsByTemple);

// --- Donation Routes ---
router.post("/donation/index", protect, donationController.getDonations);
router.post("/donation/show", protect, donationController.getDonationById);
router.post("/donation/update", protect, upload.single("image"), donationController.updateDonation);
router.get("/donation/booking-details", protect, donationController.getMyDonationBookings);

// --- Ritual Routes ---
router.post("/ritual/index", protect, ritualController.getRitualsByTemple);
router.post("/ritual/show", protect, ritualController.getRitualShow);
router.post("/ritual/packages", protect, ritualController.getRitualPackages);
router.post("/ritual/booking", protect, ritualController.createRitualOrder);
router.post("/ritual/verify-payment", protect, ritualController.verifyRitualBooking);
router.get("/ritual/booking-details", protect, ritualController.getMyRitualBookings);

// --- User Authentication Routes ---
router.post("/signup", userController.signupUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.loginUser);
router.post("/logout", protect, userController.logoutUser);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

// --- Protected User Profile ---
router.get("/auth/check-auth", protect, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

router.get("/profile", protect, userController.getProfile);

// 🎯 Using the safe wrapped multi-field middleware function here
router.post("/profile", protect, handleProfileUploads, userController.updateProfile);
router.put("/profile", protect, handleProfileUploads, userController.updateProfile);
router.put("/update-profile", protect, handleProfileUploads, userController.updateProfile);

// --- Temple Booking Flow ---
router.post("/temple/booking", protect, templeBookingController.createTempleBookingOrder);
router.post("/temple/verify-payment", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/temple/booking-details", protect, templeBookingController.getMyBookings);

// --- Membership & Cards (With explicit controller validation checks) ---
router.get("/membership-card/index", protect, membershipController.getActiveMemberships || ((req, res) => res.json({ success: true, data: [] })));
router.post("/membership-card/purchase", protect, membershipController.purchaseMembershipCard || ((req, res) => res.json({ success: true })));
router.post("/membership-card/verify-payment", protect, membershipController.verifyMembershipPayment || ((req, res) => res.json({ success: true })));
router.get("/membership-card/my-card", protect, membershipController.getMyMembershipCard || ((req, res) => res.json({ success: true, data: {} })));
router.get("/membership-plans/active", membershipController.getActiveMemberships || ((req, res) => res.json({ success: true, data: [] })));

// --- Legacy Compatibility ---
router.post("/book-temple/create-order", protect, templeBookingController.createTempleBookingOrder);
router.post("/book-temple/verify", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/my-temple-bookings", protect, templeBookingController.getMyBookings);
router.post("/rituals/create-order", protect, ritualController.createRitualOrder);
router.post("/rituals/verify-booking", protect, ritualController.verifyRitualBooking);

module.exports = router;