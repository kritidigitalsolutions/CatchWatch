const express = require("express");
const router = express.Router();

const upload = require("../../middlewares/upload.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  sendNotification,
  getNotifications,
  getAttachmentOptions,
  deleteNotification,
  markAsRead,
  getUnreadCount
} = require("../../controllers/admin/notification.controller");

router.use(isAdmin);

router.post("/send", upload.single("imageFile"), sendNotification);
router.get("/unread-count", getUnreadCount);
router.get("/attachment-options", getAttachmentOptions);
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;