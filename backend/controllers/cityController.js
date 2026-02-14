const City = require('../models/City');

exports.getCities = async (req, res) => {
    try {
        const cities = await City.find({}).sort({ name: 1 });
        res.status(200).json({ success: true, cities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};