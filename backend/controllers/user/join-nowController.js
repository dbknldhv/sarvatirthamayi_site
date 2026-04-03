const Temple = require("../../models/Temple");
const State = require("../../models/State");
const Membership = require("../../models/Membership");
const Favorite = require("../../models/Favorite");
const User = require("../../models/User");
const formatImageUrl = require("../../utils/imageUrl");

/**
 * Resolve logged-in user's numeric sql_id
 */
const getAuthUserSqlId = async (req) => {
  const directSqlId = Number(req.user?.sql_id || req.user?.user_id);
  if (!Number.isNaN(directSqlId) && directSqlId > 0) {
    return directSqlId;
  }

  const mongoUserId = req.user?._id || req.user?.id;
  if (mongoUserId) {
    const dbUser = await User.findById(mongoUserId).select("sql_id").lean();
    const dbSqlId = Number(dbUser?.sql_id);
    if (!Number.isNaN(dbSqlId) && dbSqlId > 0) {
      return dbSqlId;
    }
  }

  return 0;
};

/**
 * 1. Get States for Dropdown
 */
exports.getPublicStates = async (req, res) => {
  try {
    const uniqueStateNames = await State.distinct("name", { status: 1 });
    const states = uniqueStateNames.sort().map((name, index) => ({
      _id: index,
      name,
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      data: states,
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

/**
 * 2. Get Public Temples (List View)
 * Matches TempleListModel.dart pagination structure
 */
exports.getPublicTemples = async (req, res) => {
  try {
    const { stateName, search, page = 1, per_page = 15 } = req.query;

    const query = { status: 1 };

    if (stateName && stateName.trim() !== "" && stateName !== "undefined") {
      query.state_name = { $regex: new RegExp(stateName.trim(), "i") };
    }

    if (search && search.trim() !== "") {
      query.name = { $regex: new RegExp(search.trim(), "i") };
    }

    const currentPage = parseInt(page, 10);
    const limit = parseInt(per_page, 10);
    const skip = (currentPage - 1) * limit;

    const totalCount = await Temple.countDocuments(query);

    const temples = await Temple.find(query)
      .sort({ sequence: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const authUserSqlId = await getAuthUserSqlId(req);

    let favoriteSet = new Set();

    if (authUserSqlId > 0) {
      const favoriteDocs = await Favorite.find({
        user_id: authUserSqlId,
        type: 1,
        status: 1,
      }).lean();

      favoriteSet = new Set(
        favoriteDocs.map((fav) => Number(fav.reference_id))
      );
    }

    const templeData = temples.map((t) => ({
      id: parseInt(t.sql_id) || 0,
      name: t.name || "",
      sequence: parseInt(t.sequence) || 0,
      is_favorite: favoriteSet.has(Number(t.sql_id)) ? 1 : 0,
      image: formatImageUrl(t.image),
      image_thumb: formatImageUrl(t.image),
    }));

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Temples list fetch successfully",
      data: {
        data: templeData,
        total_count: totalCount,
        is_next: skip + templeData.length < totalCount,
        is_prev: currentPage > 1,
        total_pages: Math.ceil(totalCount / limit),
        current_page: currentPage,
        per_page: limit,
        from: totalCount === 0 ? 0 : skip + 1,
        to: skip + templeData.length,
        path: req.originalUrl,
        has_pages: totalCount > limit,
        links: [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: error.message,
    });
  }
};

/**
 * 3. Get Temple Details
 */
exports.getPublicTempleById = async (req, res) => {
  try {
    const id = req.params.id || req.body.temple_id;

    if (!id) {
      return res.status(400).json({
        status: "false",
        message: "Temple ID is required",
      });
    }

    const query = isNaN(id) ? { _id: id } : { sql_id: parseInt(id, 10) };
    const temple = await Temple.findOne(query).lean();

    if (!temple) {
      return res.status(404).json({
        status: "false",
        success: false,
        message: "Temple not found",
      });
    }

    const authUserSqlId = await getAuthUserSqlId(req);

    let isFavorite = 0;
    if (authUserSqlId > 0) {
      const favoriteExists = await Favorite.exists({
        user_id: authUserSqlId,
        reference_id: parseInt(temple.sql_id, 10),
        type: 1,
        status: 1,
      });

      isFavorite = favoriteExists ? 1 : 0;
    }

    const formattedData = {
      id: parseInt(temple.sql_id) || 0,
      name: temple.name || "",
      short_description: temple.short_description || "",
      long_description: temple.long_description || temple.description || "",
      mobile_number: temple.mobile_number || "",
      visit_price: String(temple.visit_price || "0"),
      address: {
        full_address:
          temple.full_address ||
          `${temple.city_name || ""}, ${temple.state_name || ""}`.trim(),
        address_line1: temple.address_line1 || "",
        address_line2: temple.address_line2 || "",
        landmark: temple.landmark || "",
        city: temple.city_name || "",
        state: temple.state_name || "",
        pincode: temple.pincode || "",
        country: "India",
        latitude: String(temple.latitude || ""),
        longitude: String(temple.longitude || ""),
        address_url: temple.map_url || "",
      },
      open_time: temple.open_time || "06:00 AM",
      close_time: temple.close_time || "09:00 PM",
      is_favorite: isFavorite,
      devotees_booked_count: temple.devotees_booked_count || 0,
      image: formatImageUrl(temple.image),
      image_thumb: formatImageUrl(temple.image),
    };

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Temple fetched successfully.",
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      message: error.message,
    });
  }
};

/**
 * 4. Get Active Membership Plans
 */
exports.getActiveMembershipPlans = async (req, res) => {
  try {
    const plans = await Membership.find({ status: 1 }).sort({ price: 1 }).lean();

    return res.status(200).json({
      status: "true",
      success: true,
      message: "Membership plans fetched successfully",
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      status: "false",
      success: false,
      message: "Error fetching membership plans",
      error: error.message,
    });
  }
};