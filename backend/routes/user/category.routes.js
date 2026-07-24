const express = require("express");
const router = express.Router();
const { getPublicCategories } = require("../../controllers/admin/category.controller");

router.get("/", getPublicCategories);

module.exports = router;
