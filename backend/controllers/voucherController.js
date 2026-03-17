const Voucher = require("../models/Voucher");
const { generateVoucherLeaflet } = require("../utils/pdfGenerator");

/**
 * HELPER: Generate voucher number like VCH-2026-0001
 * Tracks the latest voucher in the database to increment the serial.
 */
const generateVoucherNumber = async () => {
    const year = new Date().getFullYear();

    // Find latest voucher for ordering
    const latestVoucher = await Voucher.findOne({})
        .sort({ created_at: -1, _id: -1 })
        .select("voucher_no");

    let nextSerial = 1;

    if (latestVoucher?.voucher_no) {
        const parts = latestVoucher.voucher_no.split("-");
        const lastYear = parts[1];
        const lastSerial = parts[2];

        // If the year matches, increment serial. If year changed, reset to 1.
        if (String(lastYear) === String(year) && lastSerial) {
            nextSerial = Number(lastSerial) + 1;
        }
    }

    const serial = String(nextSerial).padStart(4, "0");
    return `VCH-${year}-${serial}`;
};

/**
 * 1. Create a New Voucher
 */
exports.createVoucher = async (req, res) => {
    try {
        const {
            title,
            code,
            description,
            discount_type,
            discount_value,
            applies_to,
            usage_type,
            max_total_usage,
            max_usage_per_user,
            expiry_date,
            status,
        } = req.body;

        const cleanCode = String(code || "").trim().toUpperCase();

        // Validation
        if (!title || !cleanCode || !discount_type || discount_value === undefined) {
            return res.status(400).json({
                success: false,
                message: "Title, code, discount type and discount value are required.",
            });
        }

        const existing = await Voucher.findOne({ code: cleanCode });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Voucher code already exists.",
            });
        }

        const voucherNo = await generateVoucherNumber();

        const voucher = await Voucher.create({
            voucher_no: voucherNo,
            title,
            code: cleanCode,
            description,
            discount_type,
            discount_value: Number(discount_value),
            applies_to: {
                temple: !!applies_to?.temple,
                ritual: !!applies_to?.ritual,
                membership: !!applies_to?.membership,
                all_services: !!applies_to?.all_services,
            },
            usage_type: usage_type || "single",
            max_total_usage: Number(max_total_usage || 1),
            max_usage_per_user: Number(max_usage_per_user || 1),
            expiry_date: expiry_date || null,
            status: status !== undefined ? Number(status) : 1,
        });

        res.status(201).json({
            success: true,
            message: "Voucher created successfully.",
            data: voucher,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create voucher.",
            error: error.message,
        });
    }
};

/**
 * 2. Get All Vouchers (Admin Dashboard)
 */
exports.getVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            count: vouchers.length,
            data: vouchers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch vouchers.",
            error: error.message,
        });
    }
};

/**
 * 3. Get Single Voucher by MongoDB ID
 */
exports.getVoucherById = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Voucher not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: voucher,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch voucher.",
            error: error.message,
        });
    }
};

/**
 * 4. Update Voucher Details
 */
exports.updateVoucher = async (req, res) => {
    try {
        const {
            title,
            code,
            description,
            discount_type,
            discount_value,
            applies_to,
            usage_type,
            max_total_usage,
            max_usage_per_user,
            expiry_date,
            status,
        } = req.body;

        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Voucher not found.",
            });
        }

        // If code is being changed, check if the new code is unique
        if (code) {
            const cleanCode = String(code).trim().toUpperCase();
            const existing = await Voucher.findOne({
                code: cleanCode,
                _id: { $ne: req.params.id },
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Another voucher already uses this code.",
                });
            }
            voucher.code = cleanCode;
        }

        if (title !== undefined) voucher.title = title;
        if (description !== undefined) voucher.description = description;
        if (discount_type !== undefined) voucher.discount_type = discount_type;
        if (discount_value !== undefined) voucher.discount_value = Number(discount_value);
        if (usage_type !== undefined) voucher.usage_type = usage_type;
        if (max_total_usage !== undefined) voucher.max_total_usage = Number(max_total_usage);
        if (max_usage_per_user !== undefined) voucher.max_usage_per_user = Number(max_usage_per_user);
        if (expiry_date !== undefined) voucher.expiry_date = expiry_date || null;
        if (status !== undefined) voucher.status = Number(status);

        if (applies_to) {
            voucher.applies_to = {
                temple: !!applies_to.temple,
                ritual: !!applies_to.ritual,
                membership: !!applies_to.membership,
                all_services: !!applies_to.all_services,
            };
        }

        await voucher.save();

        res.status(200).json({
            success: true,
            message: "Voucher updated successfully.",
            data: voucher,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update voucher.",
            error: error.message,
        });
    }
};

/**
 * 5. Delete Voucher
 */
exports.deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findByIdAndDelete(req.params.id);

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Voucher not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Voucher deleted successfully.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete voucher.",
            error: error.message,
        });
    }
};

/**
 * 6. Search Voucher by Voucher Number (e.g., VCH-2026-0001)
 */
exports.getVoucherByVoucherNo = async (req, res) => {
    try {
        const voucher = await Voucher.findOne({ voucher_no: req.params.voucher_no });

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Voucher not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: voucher,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch voucher by voucher number.",
            error: error.message,
        });
    }
};

/**
 * 7. Search Voucher by User Code (e.g., FESTIVAL20)
 */
exports.getVoucherByCode = async (req, res) => {
    try {
        const code = String(req.params.code || "").trim().toUpperCase();
        const voucher = await Voucher.findOne({ code });

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Voucher not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: voucher,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch voucher by code.",
            error: error.message,
        });
    }
};

/**
 * 8. Download Shareable Voucher Leaflet (PDF)
 * Generates the PDF and returns the URL for the admin to download/share.
 */
exports.downloadVoucherLeaflet = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ 
                success: false, 
                message: "Voucher not found" 
            });
        }

        const fileName = await generateVoucherLeaflet(voucher);
        const downloadUrl = `/vouchers/${fileName}`;
        
        res.status(200).json({ 
            success: true, 
            downloadUrl 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to generate leaflet.",
            error: error.message 
        });
    }
};