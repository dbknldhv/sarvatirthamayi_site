const Donation = require("../models/Donation");

// 1. Fetch All (Matches getDonations)
exports.getDonations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile_number: { $regex: search, $options: "i" } }
      ];
    }
    if (status !== "" && status !== undefined) query.status = Number(status);

    const totalRecords = await Donation.countDocuments(query);
    const donations = await Donation.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ success: true, donations, totalRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Single (Matches getDonationById)
exports.getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Create (Matches createDonation)
exports.createDonation = async (req, res) => {
  try {
    const newDonation = new Donation({
      ...req.body,
      image: req.file ? req.file.filename : req.body.image
    });
    await newDonation.save();
    res.status(201).json({ success: true, donation: newDonation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 4. Update (Matches updateDonation)
exports.updateDonation = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = req.file.filename;
    const updated = await Donation.findByIdAndUpdate(req.params.id, data, { new: true });
    res.status(200).json({ success: true, donation: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 5. Delete (Matches deleteDonation)
exports.deleteDonation = async (req, res) => {
  try {
    await Donation.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};