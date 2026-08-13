const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");
const chatController = require("../../controllers/chat.controller");

// All routes require authentication
router.use(isAuth);

// Conversation management
router.get("/conversations", chatController.getConversations);
router.post("/conversations", chatController.startConversation);
router.post("/conversations/:conversationId/read", chatController.markAsRead);
router.post("/conversations/:conversationId/pin", chatController.pinConversation);
router.delete("/conversations/:conversationId", chatController.clearConversation);

// Messages management
router.get("/conversations/:conversationId/messages", chatController.getMessages);
router.get("/conversations/:conversationId/pinned-messages", chatController.getPinnedMessages);
router.post("/messages", chatController.sendMessage);
router.put("/messages/:messageId", chatController.editMessage);
router.post("/messages/:messageId/unsend", chatController.unsendMessage);
router.delete("/messages/:messageId", chatController.deleteMessageForMe);
router.post("/messages/:messageId/react", chatController.toggleReaction);
router.post("/messages/:messageId/pin", chatController.togglePinMessage);
router.get("/messages/search", chatController.searchMessages);

// // Media upload for chat
router.post("/messages/upload", upload.single("attachment"), chatController.uploadChatMedia);

// // Block user management
router.post("/block/:userId", chatController.blockUser);
router.delete("/block/:userId", chatController.unblockUser);
router.get("/blocked-users", chatController.getBlockedUsers);

// // User search & status
router.get("/users/search", chatController.searchChatUsers);
router.get("/users/:userId/status", chatController.getUserStatus);

// FCM Token registration
router.post("/fcm-token", chatController.updateFcmToken);

// E2EE Key Management
router.post("/keys", chatController.setPublicKey);
router.get("/keys/:userId", chatController.getPublicKey);

// Agora Chat Token
router.get("/agora-token", chatController.getAgoraToken);

module.exports = router;
