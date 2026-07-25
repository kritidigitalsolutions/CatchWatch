const User = require("../models/user.model");

const createDefaultDemoUser = async () => {
  try {
    const demoPhone = "+919999999999";
    const existingUser = await User.findOne({ phone: demoPhone });

    if (existingUser) {
      console.log("✅ Default demo user already exists (+919999999999)");
      return;
    }

    await User.create({
      name: "Demo User",
      phone: demoPhone,
      profileComplete: true,
      role: "USER",
      genres: ["Drama", "Action"]
    });

    console.log("✅ Default demo user created (+919999999999)");
  } catch (error) {
    console.error("❌ Create Default Demo User Error:", error);
  }
};

module.exports = createDefaultDemoUser;
