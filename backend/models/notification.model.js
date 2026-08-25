const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        message: {
            type: String,
            required: true
        },

        type: {
            type: String,
            default: "GENERAL"
            // "GENERAL", "PROMOTIONAL", "SYSTEM", "CONTENT_ALERT", "SUBSCRIPTION", "BLUETICK", "CHAT", "CALL", "REEL", "FOLLOW", "ACCOUNT"
        },

        imageUrl: {
            type: String,
            default: ""
        },

        actionUrl: {
            type: String,
            default: ""
        },

        attachmentType: {
            type: String,
            enum: ["NONE", "CONTENT", "SUBSCRIPTION_PLAN"],
            default: "NONE"
        },

        contentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        contentType: {
            type: String,
            default: ""
        },

        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            default: null
        },

        // If null, notification is for all users
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        // Target specific user types (if targetUser is null)
        targetUserType: {
            type: String,
            default: "ALL" // "ALL", "SUBSCRIBERS", "NON_SUBSCRIBERS", "EXPIRING_SOON", "CREATORS"
        },

        // Track who has read this notification (for broadcast notifications)
        readBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            readAt: {
                type: Date,
                default: Date.now
            }
        }],

        // Track who has deleted this notification (for broadcast notifications)
        deletedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            deletedAt: {
                type: Date,
                default: Date.now
            }
        }],

        // For single user notifications
        isRead: {
            type: Boolean,
            default: false
        },

        readAt: {
            type: Date,
            default: null
        },

        // Delivery reporting stats
        deliveryStats: {
            totalSent: {
                type: Number,
                default: 0
            },
            delivered: {
                type: Number,
                default: 0
            },
            failed: {
                type: Number,
                default: 0
            }
        },

        // Optional metadata for linking to specific resources
        metadata: {
            propertyId: mongoose.Schema.Types.ObjectId,
            leadId: mongoose.Schema.Types.ObjectId,
            planId: mongoose.Schema.Types.ObjectId,
            contentId: mongoose.Schema.Types.ObjectId,
            actionUrl: String,
            imageUrl: String,
            extraData: mongoose.Schema.Types.Mixed
        },

        // Who created this notification
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin"
        },

        // Is notification active/visible
        isActive: {
            type: Boolean,
            default: true
        },

        // Timestamp when notification was sent
        sentAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ targetUser: 1, createdAt: -1 });
notificationSchema.index({ targetUserType: 1, createdAt: -1 });
notificationSchema.index({ isActive: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
