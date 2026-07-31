const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");

const {
  applyVerification,
  getVerificationStatus,
  cancelVerificationRequest,
  updatePendingVerification,
} = require("../../controllers/verification.controller");

const verificationUpload = upload.fields([
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

router.post("/apply", isAuth, verificationUpload, applyVerification);
router.get("/status", isAuth, getVerificationStatus);
router.put("/cancel", isAuth, cancelVerificationRequest);
router.put("/update", isAuth, verificationUpload, updatePendingVerification);

module.exports = router;
