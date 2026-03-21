const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { protect } = require('../middleware/authMiddleware');

// Flutter calls GET /api/v1/home
router.get('/', protect, homeController.getHomeData);

module.exports = router;