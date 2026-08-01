const SystemSettings = require("../models/systemSettings.model");

/**
 * Get current system settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update system settings (Admin only)
 */
exports.updateSettings = async (req, res) => {
  try {
    const {
      qualityScoreWeights,
      engagementPoints,
      adSettings,
      fraudRules,
      creatorLevels,
      rewardFormula,
    } = req.body;

    let settings = await SystemSettings.getSettings();

    if (qualityScoreWeights) {
      settings.qualityScoreWeights = { ...settings.qualityScoreWeights, ...qualityScoreWeights };
    }
    if (engagementPoints) {
      settings.engagementPoints = { ...settings.engagementPoints, ...engagementPoints };
    }
    if (adSettings) {
      settings.adSettings = { ...settings.adSettings, ...adSettings };
    }
    if (fraudRules) {
      settings.fraudRules = { ...settings.fraudRules, ...fraudRules };
    }
    if (creatorLevels) {
      settings.creatorLevels = { ...settings.creatorLevels, ...creatorLevels };
    }
    if (rewardFormula) {
      settings.rewardFormula = { ...settings.rewardFormula, ...rewardFormula };
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "System settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
