const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: "User",
    },



    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      validate: {
        validator: function (value) {
          return /^@[a-zA-Z0-9_]+$/.test(value);
        },
        message:
          "Username must start with @ and contain only letters, numbers and underscores",
      },
    },

    profileImage: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    genres: {
      type: [String],
      required: true,
      default: ["Drama"],
      validate: {
        validator: (value) => value.length > 0,
        message: "At least one genre is required",
      },
    },

    // googleId: {
    //   type: String,
    //   unique: true,
    //   sparse: true,
    // },

    authProvider: {
      type: String,
      // enum: ["PHONE", "GOOGLE"],
      default: "PHONE",
    },

    profileComplete: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      // enum: ["USER"],
      default: "USER",
    },

    status: {
      type: String,
      // enum: ["Active", "Blocked"],
      default: "Active",
    },

    fcmToken: {
      type: String,
      default: "",
    },

    fcmTokenUpdatedAt: {
      type: Date,
    },

    publicKey: {
      type: String,
      default: "",
    },

    e2eeIdentity: {
      keyId: {
        type: String,
        default: "",
      },
      publicKey: {
        type: String,
        default: "",
      },
      encryptedPrivateKeyBackup: {
        ciphertext: { type: String, default: "" },
        iv: { type: String, default: "" },
        salt: { type: String, default: "" },
        iterations: { type: Number, default: 100000 },
        version: { type: Number, default: 1 },
      },
      hasBackup: {
        type: Boolean,
        default: false,
      },
      backupUpdatedAt: {
        type: Date,
      },
    },

    sessions: {
      web: {
        sessionId: {
          type: String,
          default: "",
          index: true,
        },
        deviceId: {
          type: String,
          default: "",
        },
        lastActive: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["ACTIVE", "REVOKED"],
          default: "ACTIVE",
        },
      },
      mobile: {
        sessionId: {
          type: String,
          default: "",
          index: true,
        },
        deviceId: {
          type: String,
          default: "",
        },
        lastActive: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["ACTIVE", "REVOKED"],
          default: "ACTIVE",
        },
      },
    },

    activeSession: {
      sessionId: {
        type: String,
        default: "",
        index: true,
      },
      deviceId: {
        type: String,
        default: "",
      },
      keyId: {
        type: String,
        default: "",
      },
      publicKey: {
        type: String,
        default: "",
      },
      lastActive: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["ACTIVE", "REVOKED"],
        default: "ACTIVE",
      },
    },

    deviceKeys: [
      {
        deviceId: {
          type: String,
          required: true,
          trim: true,
        },
        keyId: {
          type: String,
          required: true,
          trim: true,
        },
        publicKey: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastSeenAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    verification: {
      status: {
        type: String,
        enum: [
          "NOT_VERIFIED",
          "PENDING",
          "VERIFIED",
          "REJECTED",
          "SUSPENDED"
        ],
        default: "NOT_VERIFIED"
      },
      badgeType: {
        type: String,
        default: "ORANGE"
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin"
      },
      rejectionReason: String,
      suspensionReason: String,
      expiryDate: Date,
      isVerified: {
        type: Boolean,
        default: false
      }
    },

    // Creator Quality Score & Rewards Fields
    isCreator: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    creatorStatus: {
      type: String,
      enum: ["Active", "Disabled", "Pending"],
      default: "Active",
    },

    creatorJoinedAt: {
      type: Date,
      default: Date.now,
    },

    creatorCategory: {
      type: String,
      default: "General",
    },

    qualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    creatorLevel: {
      type: String,
      enum: ["Beginner", "Rising Creator", "Professional Creator", "Premium Creator", "Bronze", "Silver", "Gold", "Platinum", "Diamond"],
      default: "Beginner",
    },

    totalEngagementPoints: {
      type: Number,
      default: 0,
    },

    totalQualifiedViews: {
      type: Number,
      default: 0,
    },

    totalWatchMinutes: {
      type: Number,
      default: 0,
    },

    totalCreatorFollowers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


userSchema.virtual("blueTick").get(function () {
  return Boolean(
    this.isVerified ||
    (this.verification && (this.verification.isVerified || this.verification.status === "VERIFIED"))
  );
});

userSchema.virtual("orangeTick").get(function () {
  return Boolean(
    this.isVerified ||
    (this.verification && (this.verification.isVerified || this.verification.status === "VERIFIED"))
  );
});

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);
