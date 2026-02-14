const express = require('express');
const router = express.Router();
const mobileRitualRoutes = require('./mobileRitualRoutes');

// Map the ritual routes
router.use('/rituals', mobileRitualRoutes);

module.exports = router;