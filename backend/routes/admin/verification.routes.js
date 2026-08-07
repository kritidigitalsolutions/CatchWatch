const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  getAllVerificationRequests,
  getPendingVerificationRequests,
  getVerificationStats,
  getVerificationRequestById,
  approveVerification,
  rejectVerification,
  suspendVerification,
  removeVerification,
  manuallyVerifyUser,
  deleteVerificationRequest,
  getUsersForSelection,
} = require("../../controllers/verification.controller");

router.use(isAdmin);

router.get("/", getAllVerificationRequests);
router.get("/pending", getPendingVerificationRequests);
router.get("/stats", getVerificationStats);
router.get("/users-select", getUsersForSelection);
router.get("/:id", getVerificationRequestById);

router.delete("/:id", deleteVerificationRequest);

router.patch("/approve", approveVerification);
router.patch("/reject", rejectVerification);
router.patch("/suspend", suspendVerification);
router.patch("/remove", removeVerification);
router.patch("/user/verify", manuallyVerifyUser);

module.exports = router;
