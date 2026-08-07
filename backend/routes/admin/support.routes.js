const express = require("express");

const router = express.Router();

const {
  isAdmin,
} = require("../../middlewares/admin.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  getAllTickets,
  getAdminSingleTicket,
  adminReplyTicket,
  updateTicketStatus,
  getAdminTicketConversation,
  createAdminSupportTicket,
  deleteSupportTicket,
  deleteSupportMessage,
} = require("../../controllers/admin/support.controller");


// ========================================
// GET ALL TICKETS
// ========================================
router.get(
  "/",
  isAdmin,
  getAllTickets
);

// ========================================
// CREATE TICKET
// ========================================
router.post(
  "/",
  isAdmin,
  createAdminSupportTicket
);


// ========================================
// GET SINGLE TICKET
// ========================================
router.get(
  "/:id",
  isAdmin,
  getAdminSingleTicket
);


// ========================================
// ADMIN REPLY
// ========================================
router.post(
  "/reply/:id",
  isAdmin,
  upload.array("attachments", 5),
  adminReplyTicket
);


// ========================================
// UPDATE STATUS
// ========================================
router.patch(
  "/status/:id",
  isAdmin,
  updateTicketStatus
);

// ========================================
// GET TICKET CONVERSATION
// ======================================== 
router.get(
  "/conversation/:id",
  isAdmin,
  getAdminTicketConversation
);

// ========================================
// DELETE TICKET
// ========================================
router.delete(
  "/:id",
  isAdmin,
  deleteSupportTicket
);

// ========================================
// DELETE MESSAGE
// ========================================
router.delete(
  "/message/:messageId",
  isAdmin,
  deleteSupportMessage
);

module.exports = router;