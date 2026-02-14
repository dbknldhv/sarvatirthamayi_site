const express = require('express');
const router = express.Router();
const { getRituals } = require('../../controllers/ritualController');

// The Mobile app only needs to "Get" rituals
router.get('/', getRituals);

module.exports = router;