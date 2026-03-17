const Voucher = require("../models/Voucher");

/**
 * 🛠️ VOUCHER VALIDATOR
 * Verifies if a code is valid, not expired, and not already used by THIS user.
 */
exports.validateVoucher = async (voucherCode, userId, serviceType, baseAmount) => {
  if (!voucherCode) return { discountAmount: 0, finalAmount: baseAmount };

  const code = voucherCode.trim().toUpperCase();
  const voucher = await Voucher.findOne({ code, status: 1 });

  if (!voucher) throw new Error("Invalid voucher code");

  // 1. Expiry Check
  if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
    throw new Error("This voucher has expired");
  }

  // 2. Applicability Check (Checkboxes)
  const isApplicable = voucher.applies_to.all_services || voucher.applies_to[serviceType];
  if (!isApplicable) throw new Error(`This voucher is not valid for ${serviceType} services`);

  // 3. Global Usage Check
  if (voucher.used_count >= voucher.max_total_usage) {
    throw new Error("Voucher usage limit reached");
  }

  // 4. ONE-TIME USE CHECK (Security)
  const hasUsed = voucher.used_by.some(id => id.toString() === userId.toString());
  if (hasUsed && voucher.usage_type === "single") {
    throw new Error("You have already used this voucher once");
  }

  // 5. Calculate Discount
  let discountAmount = 0;
  if (voucher.discount_type === "percentage") {
    discountAmount = (baseAmount * voucher.discount_value) / 100;
  } else {
    discountAmount = voucher.discount_value;
  }

  // Don't let discount exceed the total price
  if (discountAmount > baseAmount) discountAmount = baseAmount;

  return {
    voucherId: voucher._id,
    discountAmount: Number(discountAmount.toFixed(2)),
    finalAmount: Number((baseAmount - discountAmount).toFixed(2))
  };
};

/**
 * ✅ VOUCHER REDEEMER
 * Call this ONLY after Razorpay payment is confirmed.
 */
exports.redeemVoucher = async (voucherId, userId) => {
  if (!voucherId) return;
  return await Voucher.findByIdAndUpdate(voucherId, {
    $inc: { used_count: 1 },
    $addToSet: { used_by: userId } // Adds user to the used list
  });
};