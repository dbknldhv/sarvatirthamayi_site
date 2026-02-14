const RitualPackage = require("../models/RitualPackage");
const mongoose = require("mongoose");

exports.getRitualPackages = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    const query = {};

    if (search) query.name = { $regex: search, $options: "i" };
    if (status) query.status = status;

    const packages = await RitualPackage.find(query)
      .populate("ritual_id", "name")
      .populate("temple_id", "name")
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RitualPackage.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      data: packages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getRitualPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    let ritualPackage;

    if (mongoose.Types.ObjectId.isValid(id)) {
      ritualPackage = await RitualPackage.findById(id).populate("ritual_id temple_id");
    } else {
      ritualPackage = await RitualPackage.findOne({ sql_id: id }).populate("ritual_id temple_id");
    }

    if (!ritualPackage) return res.status(404).json({ success: false, message: "Package not found" });
    res.status(200).json({ success: true, data: ritualPackage });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.createRitualPackage = async (req, res) => {
  try {
    const newPackage = await RitualPackage.create(req.body);
    res.status(201).json({ success: true, data: newPackage });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateRitualPackage = async (req, res) => {
  try {
    const updated = await RitualPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteRitualPackage = async (req, res) => {
  try {
    await RitualPackage.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Package Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};