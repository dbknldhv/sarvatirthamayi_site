// backend/controllers/user/userCardController.js
const PurchasedMemberCard = require('../../models/PurchasedMemberCard');
const Temple = require('../../models/Temple');

exports.getMyCard = async (req, res) => {
  try {
    // 🎯 FIX: Changed query parameter filter lookup from sql_id back to req.user.id
    // to match Mongoose's expected 24-character ObjectId pattern allocation mapping.
    const card = await PurchasedMemberCard.findOne({ 
      user_id: req.user.id, 
      payment_status: 1 
    }).populate('membership_card_id');

    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: "No active membership card found." 
      });
    }

    // Safely extract raw object layers to protect against serialization spreads crashing
    const rawCardData = card.toObject ? card.toObject() : (card._doc || card);

    const templeDetails = await Temple.find({
      name: { $in: rawCardData.favorite_temples || [] }
    }).select('name image location');

    return res.status(200).json({
      success: true,
      data: {
        ...rawCardData,
        templeDetails 
      }
    });
  } catch (error) {
    console.error("🔥 Error inside getMyCard:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message 
    });
  }
};