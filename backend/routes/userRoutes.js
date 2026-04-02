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
const homeController = require("../controllers/user/homeController");
const donationController = require("../controllers/user/donationController");
const contactController = require("../controllers/user/contactController");
const termsController = require("../controllers/user/termsController"); 
const privacyController = require("../controllers/user/privacyController");

const offerController = require("../controllers/user/offerController");

// --- 2. Import Middleware ---
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// --- 3. Base & Health Check Routes ---
router.get("/test-route", (req, res) => {
  res.json({ message: "User router is working!" });
});


router.post("/contact-us", contactController.contactUs);

// --- 4. Public / Basic Data Routes ---
router.get("/home", protect, homeController.getHomeData);
router.get("/about-data", aboutController.getAboutPageData);
router.get("/about-us", aboutController.getAboutUs);
router.get("/term-condition", termsController.getTermsAndConditions);
router.get("/privacy-policy", privacyController.getPrivacyPolicy);

router.get("/states", joinNowController.getPublicStates);
//offer Zone
router.get("/offers", offerController.getOffers);
router.post("/offer/index", offerController.getOffers);
router.post("/offer/show", offerController.getOfferById);
router.get("/offers/:id", offerController.getOfferById);


// --- Temple Public Routes ---
router.get("/temple/index", joinNowController.getPublicTemples);
router.post("/temple/show", joinNowController.getPublicTempleById);
router.get("/temples", joinNowController.getPublicTemples);
router.get("/temples/:id", joinNowController.getPublicTempleById);
router.get("/temple-assistants/:templeId", userController.getAssistantsByTemple);

// --- Donation Routes ---
router.post("/donation/index", protect, donationController.getDonations);
router.post("/donation/show", protect, donationController.getDonationById);
router.post("/donation/update", protect, upload.single("image"), donationController.updateDonation);
router.get(
  "/donation/booking-details",
  protect,
  donationController.getMyDonationBookings
);
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

// --- Protected User Routes ---
router.get("/auth/check-auth", protect, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

router.get("/profile", protect, userController.getProfile);
router.post(
  "/profile",
  protect,
  upload.fields([{ name: "profile_picture", maxCount: 1 }]),
  userController.updateProfile
);

router.put(
  "/update-profile",
  protect,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  userController.updateProfile
);

// --- Temple Booking Flow ---
router.post("/temple/booking", protect, templeBookingController.createTempleBookingOrder);
router.post("/temple/verify-payment", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/temple/booking-details", protect, templeBookingController.getMyBookings);

// --- Membership & Cards ---
router.get("/membership-card/index", protect, cardController.getMyMembershipCard);
router.post("/membership-card/purchase", protect, cardController.createMembershipOrder);
router.post("/membership-card/verify-payment", protect, cardController.verifyAndActivateMembership);

// --- Legacy Routes ---
router.post("/book-temple/create-order", protect, templeBookingController.createTempleBookingOrder);
router.post("/book-temple/verify", protect, templeBookingController.verifyAndConfirmBooking);
router.get("/my-temple-bookings", protect, templeBookingController.getMyBookings);
router.post("/rituals/create-order", protect, ritualController.createRitualOrder);
router.post("/rituals/verify-booking", protect, ritualController.verifyRitualBooking);

module.exports = router;