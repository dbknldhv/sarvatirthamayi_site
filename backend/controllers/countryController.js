// Change this line:
// const Country = require('../../models/Country'); 

// To this (assuming your folder is named 'models'):
const Country = require('../models/Country');

// OR this (if your folder is named 'model'):
// const Country = require('../model/Country');

exports.getCountries = async (req, res) => {
  try {
    const countries = await Country.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      countries: countries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching countries",
      error: error.message
    });
  }
};