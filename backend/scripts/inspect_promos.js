require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const connectDB = require("../config/db");
const Promo = require("../models/promocode.model");

const inspect = async () => {
  await connectDB();
  
  // Find or create SAVE50
  let save50 = await Promo.findOne({ code: "SAVE50" });
  if (!save50) {
    console.log("SAVE50 promo not found. Creating it...");
    save50 = await Promo.create({
      code: "SAVE50",
      discountType: "percentage",
      discountValue: 50,
      applicablePlans: [], // empty means applicable to all
      maxUses: 1000,
      usedCount: 0,
      expiryDate: new Date("2030-12-31"),
      isActive: true,
      description: "50% off on any subscription plan"
    });
    console.log("SAVE50 created:", save50);
  } else {
    console.log("SAVE50 promo already exists:", save50);
    // Make sure it is active and not expired
    save50.isActive = true;
    save50.expiryDate = new Date("2030-12-31");
    await save50.save();
    console.log("SAVE50 updated/ensured active.");
  }

  process.exit(0);
};

inspect();
