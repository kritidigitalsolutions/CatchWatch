const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const {
  requireVipVerification,
} = require("../../middlewares/vip.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  createTicket,
  getMyTickets,
  getSingleTicket,
  replyToTicket,
  getTicketConversation,
  checkVipAccess,
  createVipTicket,
  getMyVipTickets,
} = require("../../controllers/support.controller");


// ========================================
// VIP SUPPORT ROUTES (BLUETICK RESTRICTED)
// ========================================

// Check VIP access status (returns verification status)
router.get(
  "/vip/access-check",
  isAuth,
  checkVipAccess
);

// Create VIP Ticket (strictly protected by blue-tick verification)
router.post(
  "/vip",
  isAuth,
  requireVipVerification,
  upload.array("attachments", 5),
  createVipTicket
);

// Get My VIP Tickets (strictly protected by blue-tick verification)
router.get(
  "/vip",
  isAuth,
  requireVipVerification,
  getMyVipTickets
);

// Get Single VIP Ticket Conversation (strictly protected by blue-tick verification)
router.get(
  "/vip/:id",
  isAuth,
  requireVipVerification,
  getSingleTicket
);

// Reply to VIP Ticket (strictly protected by blue-tick verification)
router.post(
  "/vip/reply/:id",
  isAuth,
  requireVipVerification,
  upload.array("attachments", 5),
  replyToTicket
);


// ========================================
// GENERAL SUPPORT ROUTES
// ========================================
router.post(
  "/",
  isAuth,
  upload.array("attachments", 5),
  createTicket
);

router.get(
  "/",
  isAuth,
  getMyTickets
);

router.get(
  "/:id",
  isAuth,
  getSingleTicket
);

router.post(
  "/reply/:id",
  isAuth,
  upload.array("attachments", 5),
  replyToTicket
);

router.get(
  "/conversation/:id",
  isAuth,
  getTicketConversation
);

module.exports = router;