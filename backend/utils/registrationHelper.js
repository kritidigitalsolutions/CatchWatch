const axios = require("axios");
const User = require("../models/user.model");

/**
 * Generate a unique registration application number for Catch & Watch users
 * Format: CW + current year + 4 digits (e.g. CW20268491)
 */
const generateUniqueRegistrationNumber = async () => {
  const currentYear = new Date().getFullYear();
  let isUnique = false;
  let regNo = "";
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    attempts++;
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    regNo = `CW${currentYear}${randomDigits}`;

    const exists = await User.findOne({ registrationNumber: regNo });
    if (!exists) {
      isUnique = true;
    }
  }

  // Fallback in case of collision
  if (!isUnique) {
    regNo = `CW${Date.now().toString().slice(-8)}`;
  }

  return regNo;
};

/**
 * Send Welcome / Registration Application Number SMS via SMS Gateway Hub (Optional / Fallback)
 */
const sendRegistrationSMS = async (phone, registrationNumber) => {
  try {
    const templateId = process.env.SMS_GH_REG_DLT_TEMPLATE_ID;
    const templateText =
      process.env.SMS_GH_REG_TEXT ||
      "Welcome to Catch & Watch ! Your registration application number is {{regNo}}. Thank you for registering with us.";

    if (!templateId) {
      return false;
    }

    const message = templateText.replace("{{regNo}}", registrationNumber);
    const cleanPhone = phone.replace("+91", "").trim();

    const response = await axios.get("https://www.smsgatewayhub.com/api/mt/SendSMS", {
      params: {
        APIKey: process.env.SMS_GH_API_KEY,
        senderid: process.env.SMS_GH_SENDER_ID || "CANDWS",
        channel: "2",
        DCS: 0,
        flashsms: 0,
        number: cleanPhone,
        text: message,
        route: process.env.SMS_GH_ROUTE || "47",
        EntityId: process.env.SMS_GH_ENTITY_ID,
        dlttemplateid: templateId,
      },
    });

    console.log("[REGISTRATION SMS RESPONSE]:", response.data);

    if (response.data && response.data.ErrorCode !== "000") {
      console.error("[REGISTRATION SMS] Gateway Error:", response.data);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[REGISTRATION SMS ERROR]:",
      error.response?.data || error.message
    );
    return false;
  }
};

module.exports = {
  generateUniqueRegistrationNumber,
  sendRegistrationSMS,
};

