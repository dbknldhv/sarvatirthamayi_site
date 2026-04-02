exports.getTermsAndConditions = async (req, res) => {
  try {
    return res.status(200).json({
      status: "true",
      message: "Terms and conditions retrieved successfully.",
      data: [
        "All devotees must provide accurate personal and booking details while using the Sarvatirthamayi platform.",
        "Temple visit bookings, ritual bookings, memberships, and donations are subject to availability and verification.",
        "Payments once successfully processed may be governed by the cancellation and refund policy applicable to the selected service.",
        "Users must not misuse the application, attempt fraudulent transactions, or provide false information.",
        "Sarvatirthamayi reserves the right to update temple details, pricing, availability, and service policies without prior notice.",
        "Membership benefits, discounts, and access are subject to the terms defined under the selected membership plan.",
        "Donation amounts are voluntary and will be processed for the selected temple or service as per platform flow.",
        "Users are responsible for maintaining the confidentiality of their account and login credentials.",
        "Sarvatirthamayi is not responsible for delays or service interruptions caused by third-party payment gateways, network issues, or unforeseen events.",
        "By using this application, the user agrees to abide by all platform rules, service conditions, and applicable laws."
      ]
    });
  } catch (error) {
    console.error("Terms & Conditions Controller Error:", error);
    return res.status(500).json({
      status: "false",
      message: "Something went wrong",
      data: []
    });
  }
};