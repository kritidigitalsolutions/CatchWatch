const SupportTicket = require(
  "../models/supportTicket.model"
);

const SupportMessage = require(
  "../models/supportMessage.model"
);

const User = require("../models/user.model");


// ========================================
// CREATE TICKET
// ========================================
exports.createTicket = async (
  req,
  res
) => {
  try {
    const {
      subject,
      message,
      category,
    } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and message are required",
      });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => file.cdnUrl || file.path);
    } else if (req.body.attachments) {
      attachments = Array.isArray(req.body.attachments)
        ? req.body.attachments
        : typeof req.body.attachments === "string"
          ? [req.body.attachments]
          : [];
    }

    // ========================================
    // CREATE TICKET
    // ========================================
    const ticket =
      await SupportTicket.create({
        user: req.user.id,
        subject,
        category,
        lastMessage: message,
        status: "OPEN",
        attachments,
      });

    // ========================================
    // CREATE FIRST MESSAGE
    // ========================================
    const firstMessage = await SupportMessage.create({
      ticket: ticket._id,
      senderType: "USER",
      senderModel: "User",
      senderId: req.user.id,
      message,
      attachments,
    });

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket,
      firstMessage,
    });

  } catch (error) {
    console.error(
      "Create Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// GET MY TICKETS
// ========================================
exports.getMyTickets = async (
  req,
  res
) => {
  try {
    const tickets =
      await SupportTicket.find({
        user: req.user.id,
      }).sort({
        updatedAt: -1,
      });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });

  } catch (error) {
    console.error(
      "Get My Tickets Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// GET SINGLE TICKET
// ========================================
exports.getSingleTicket = async (
  req,
  res
) => {
  try {
    const ticket =
      await SupportTicket.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).populate(
        "user",
        "name phone email"
      );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // ========================================
    // GET CONVERSATION
    // ========================================
    const messages =
      await SupportMessage.find({
        ticket: ticket._id,
      })
        .populate(
          "senderId",
          "name email"
        )
        .sort({
          createdAt: 1,
        });

    res.status(200).json({
      success: true,
      ticket,
      messages,
    });

  } catch (error) {
    console.error(
      "Get Single Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// REPLY TO TICKET
// ========================================
exports.replyToTicket = async (
  req,
  res
) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const ticket =
      await SupportTicket.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // ========================================
    // CLOSED TICKET CHECK
    // ========================================
    if (ticket.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Ticket is closed",
      });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => file.cdnUrl || file.path);
    } else if (req.body.attachments) {
      attachments = Array.isArray(req.body.attachments)
        ? req.body.attachments
        : typeof req.body.attachments === "string"
          ? [req.body.attachments]
          : [];
    }

    // ========================================
    // CREATE MESSAGE
    // ========================================
    await SupportMessage.create({
      ticket: ticket._id,
      senderType: "USER",
      senderModel: "User",
      senderId: req.user.id,
      message,
      attachments,
    });

    // ========================================
    // UPDATE TICKET
    // ========================================
    ticket.lastMessage = message;

    // customer replied again
    ticket.status = "OPEN";

    if (attachments && attachments.length > 0) {
      ticket.attachments = [...(ticket.attachments || []), ...attachments];
    }

    await ticket.save();

    // ========================================
    // RETURN UPDATED CHAT
    // ========================================
    const messages =
      await SupportMessage.find({
        ticket: ticket._id,
      })
        .populate(
          "senderId",
          "name email"
        )
        .sort({
          createdAt: 1,
        });

    res.status(200).json({
      success: true,
      message:
        "Reply sent successfully",
      messages,
    });

  } catch (error) {
    console.error(
      "Reply Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// ========================================
// GET COMPLETE CONVERSATION
// ========================================
exports.getTicketConversation =
  async (req, res) => {
    try {
      const ticket =
        await SupportTicket.findOne({
          _id: req.params.id,
          user: req.user.id,
        }).populate(
          "user",
          "name email phone"
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      const messages =
        await SupportMessage.find({
          ticket: ticket._id,
        })
          .populate(
            "senderId",
            "name email"
          )
          .sort({
            createdAt: 1,
          });

      res.status(200).json({
        success: true,

        conversation: {
          ticketId: ticket._id,
          subject: ticket.subject,
          category: ticket.category,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,

          user: ticket.user,

          messages,
        },
      });

    } catch (error) {
      console.error(
        "Get Conversation Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };


// ========================================
// VIP: CHECK VIP ACCESS STATUS
// ========================================
exports.checkVipAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        isVerified: false,
        message: "User not found",
      });
    }

    const isVerifiedUser =
      user.isVerified === true ||
      user.verification?.isVerified === true ||
      user.verification?.status === "VERIFIED";

    return res.status(200).json({
      success: true,
      isVerified: isVerifiedUser,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        profileImage: user.profileImage,
        isVerified: isVerifiedUser,
        verificationStatus: user.verification?.status || "NOT_VERIFIED",
      },
    });
  } catch (error) {
    console.error("Check VIP Access Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// VIP: CREATE VIP SUPPORT TICKET
// ========================================
exports.createVipTicket = async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required for VIP support inquiry",
      });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => file.cdnUrl || file.path);
    } else if (req.body.attachments) {
      attachments = Array.isArray(req.body.attachments)
        ? req.body.attachments
        : typeof req.body.attachments === "string"
        ? [req.body.attachments]
        : [];
    }

    const validCategory = [
      "TECHNICAL_GLITCH",
      "BROADCAST",
      "COPYRIGHT",
      "ACCOUNT_RECOVERY",
      "TECHNICAL",
      "ACCOUNT",
      "PAYMENT",
      "BILLING",
      "OTHER",
    ].includes(category)
      ? category
      : "TECHNICAL_GLITCH";

    const ticketPriority = priority && ["URGENT", "HIGH", "MEDIUM", "LOW"].includes(priority)
      ? priority
      : "URGENT";

    const ticket = await SupportTicket.create({
      user: req.user.id,
      subject,
      category: validCategory,
      priority: ticketPriority,
      isVip: true,
      lastMessage: message,
      status: "OPEN",
      attachments,
    });

    const firstMessage = await SupportMessage.create({
      ticket: ticket._id,
      senderType: "USER",
      senderModel: "User",
      senderId: req.user.id,
      message,
      attachments,
    });

    res.status(201).json({
      success: true,
      message: "VIP Support Inquiry created successfully. Priority support desk notified.",
      ticket,
      firstMessage,
    });
  } catch (error) {
    console.error("Create VIP Ticket Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating VIP ticket",
    });
  }
};


// ========================================
// VIP: GET MY VIP TICKETS
// ========================================
exports.getMyVipTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({
      user: req.user.id,
      isVip: true,
    }).sort({
      updatedAt: -1,
    });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("Get My VIP Tickets Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching VIP tickets",
    });
  }
};