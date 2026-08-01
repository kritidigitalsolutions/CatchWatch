const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getAdminAdDashboard,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  duplicateCampaign,
  deleteCampaign,
} = require("../../controllers/ad.controller");

const upload = require("../../middlewares/upload.middleware");

router.get("/dashboard", isAdmin, getAdminAdDashboard);
router.get("/campaigns", isAdmin, getCampaigns);
router.post(
  "/campaigns",
  isAdmin,
  upload.fields([
    { name: "mediaFile", maxCount: 1 },
    { name: "media", maxCount: 1 },
    { name: "thumbnailFile", maxCount: 1 },
  ]),
  createCampaign
);
router.patch("/campaigns/:id/status", isAdmin, updateCampaignStatus);
router.post("/campaigns/:id/duplicate", isAdmin, duplicateCampaign);
router.delete("/campaigns/:id", isAdmin, deleteCampaign);

module.exports = router;
