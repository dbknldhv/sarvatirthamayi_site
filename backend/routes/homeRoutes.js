const express = require('express');
const router = express.Router();
// Make sure you have a home controller or use a function in userController
const { getHomeData } = require('../controllers/homeController'); 
const { protect } = require('../middleware/authMiddleware'); // Or wherever your protect is

// This handles: GET /api/v1/home/
router.get('/', protect, getHomeData);

module.exports = router;