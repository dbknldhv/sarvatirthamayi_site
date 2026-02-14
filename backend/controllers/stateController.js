const State = require("../models/State");

exports.getStates = async (req, res) => {
  try {
    const states = await State.find({ status: 1 }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      states
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
