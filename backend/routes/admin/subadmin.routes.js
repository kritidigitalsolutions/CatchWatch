const express = require("express");
const router = express.Router();
const { isAdmin, isSuperAdmin } = require("../../middlewares/admin.middleware");
const {
  getAllSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  toggleSubAdminStatus,
  deleteSubAdmin,
} = require("../../controllers/admin_auth/subadmin.controller");

// All subadmin management routes require logged in admin AND super admin (role === "ADMIN")
router.use(isAdmin, isSuperAdmin);

router.get("/", getAllSubAdmins);
router.post("/", createSubAdmin);
router.put("/:id", updateSubAdmin);
router.patch("/:id/status", toggleSubAdminStatus);
router.delete("/:id", deleteSubAdmin);

module.exports = router;
