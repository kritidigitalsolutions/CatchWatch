const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const callController = require("../../controllers/call.controller");

// All calling routes require JWT authentication
router.use(isAuth);

// Start & Call History
router.post("/", callController.startCall);
router.get("/history", callController.getCallHistory);
router.get("/:callId", callController.getCallById);

// Call Lifecycle Actions
router.post("/:callId/token", callController.getCallToken);
router.post("/:callId/accept", callController.acceptCall);
router.post("/:callId/reject", callController.rejectCall);
router.post("/:callId/busy", callController.busyCall);
router.post("/:callId/cancel", callController.cancelCall);
router.post("/:callId/missed", callController.missedCall);
router.post("/:callId/end", callController.endCall);

module.exports = router;
