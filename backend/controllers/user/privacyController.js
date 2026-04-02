exports.getPrivacyPolicy = async (req, res) => {
  try {
    return res.status(200).json({
      status: "true",
      message: "Privacy policy retrieved successfully.",
      data: {
        privacy:
          "Sarvatirthamayi respects the privacy of every devotee and user who uses the platform. We collect only the information required to provide temple visits, ritual bookings, donations, memberships, profile services, and other devotional offerings in a smooth and secure manner. Personal information such as your name, mobile number, email address, booking details, and payment references may be stored to manage services and improve user experience.",

        policy:
          "User information is handled with reasonable care and is used only for operational, support, communication, booking, and service-related purposes. Sarvatirthamayi does not intentionally misuse personal data and takes appropriate steps to protect account-related information. By using this application, the user agrees that required information may be processed for temple services, transaction records, customer support, notifications, and platform improvement. Sarvatirthamayi may update this privacy policy from time to time to reflect service or legal changes."
      }
    });
  } catch (error) {
    console.error("Privacy Policy Controller Error:", error);
    return res.status(500).json({
      status: "false",
      message: "Something went wrong",
      data: null
    });
  }
};