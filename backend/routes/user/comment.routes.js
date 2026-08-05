const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const {
  addComment,
  getComments,
  deleteComment,
  togglePinComment,
} = require("../../controllers/comment.controller");

// Add Comment
router.post(
  "/:reelId",
  isAuth,
  addComment
);

// Get Comments
router.get(
  "/:reelId",
  getComments
);

// Delete Comment
router.delete(
  "/:commentId",
  isAuth,
  deleteComment
);

// Pin / Unpin Comment (Reel Creator Only)
router.post(
  "/pin/:commentId",
  isAuth,
  togglePinComment
);

router.post(
  "/:commentId/pin",
  isAuth,
  togglePinComment
);

module.exports = router;