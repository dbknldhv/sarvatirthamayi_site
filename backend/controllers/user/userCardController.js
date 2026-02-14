// controllers/userCardController.js
const PurchasedMemberCard = require('../models/PurchasedMemberCard');
const Temple = require('../models/Temple');

exports.getMyCard = async (req, res) => {
  try {
    // 1. Fetch the card and populate the basic membership info
    const card = await PurchasedMemberCard.findOne({ 
      user_id: req.user.id, 
      payment_status: 1 // Only fetch if payment is successful
    }).populate('membership_card_id');

    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: "No active membership card found." 
      });
    }

    // 2. Fetch the Temple objects for the user's 5 favorite names
    // This gives us access to the images for the digital card UI
    const templeDetails = await Temple.find({
      name: { $in: card.favorite_temples }
    }).select('name image location');

    // 3. Return the merged data
    res.status(200).json({
      success: true,
      data: {
        ...card._doc,
        templeDetails // Array of full Temple objects
      }
    });
  } catch (error) {
    console.error("Error fetching member card:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};