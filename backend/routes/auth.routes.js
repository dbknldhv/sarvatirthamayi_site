const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/authMiddleware');

// 1. Authentication & Session
router.post('/login', authController.login);
router.get('/refresh', authController.refreshAccessToken); // Added for Auto-Update
router.post('/logout', authController.logout);             // Added for Cookie clearing

// 2. Registration & OTP
router.post('/signup', authController.signUp);       
router.post('/verify-otp', authController.verifyOtp);
router.post('/admin/signup', authController.adminSignup);

// 3. Status Check (Used by React to verify token on mount)
// Path: /api/admin/auth/check-auth
router.get('/check-auth', protect, (req, res) => {
  res.status(200).json({ 
    success: true, 
    user: {
      id: req.user._id,
      first_name: req.user.first_name,
      user_type: req.user.user_type,
      role: req.user.role
    } 
  });
});

module.exports = router;