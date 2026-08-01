const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const { getSettings, updateSettings } = require("../../controllers/settings.controller");

router.get("/", isAdmin, getSettings);
router.put("/", isAdmin, updateSettings);

module.exports = router;
