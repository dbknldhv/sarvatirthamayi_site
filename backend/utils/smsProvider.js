const twilio = require('twilio');

/**
 * 🎯 The SMS Dispatcher
 * Automatically toggles based on .env configuration
 */
exports.sendSMS = async (mobileNumber, otp) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  // 🛡️ Logic Check: If credentials are missing or placeholders, skip SMS
  if (!sid || !token || !from || sid.includes("your_account")) {
    console.log("ℹ️ Twilio not configured. Skipping SMS OTP.");
    return { success: false, message: "Twilio disabled" };
  }

  try {
    const client = new twilio(sid, token);
    
    // Format number to +91 (India) for Twilio compatibility
    let formattedNumber = String(mobileNumber).replace(/\D/g, "").slice(-10);
    formattedNumber = `+91${formattedNumber}`;

    const response = await client.messages.create({
      body: `Your STM Club verification code is: ${otp}. Valid for 10 minutes.`,
      from: from,
      to: formattedNumber,
    });

    console.log(`✅ SMS Sent: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error("❌ Twilio Error:", error.message);
    return { success: false, error: error.message };
  }
};