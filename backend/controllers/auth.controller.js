const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const OTP = require("../models/user.otp.model");
const User = require("../models/user.model");
const { revokeUserSockets } = require("../socket/chatSocket");

const { admin } = require("../config/firebase");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const axios = require("axios");

const DUMMY_OTP_PHONE = "+919999999999";
const DUMMY_OTP_CODE = "123456";

const isDummyOtpPhone = (phone) =>
  phone === DUMMY_OTP_PHONE;

const isDummyOtpCode = (otp) => {
  const str = String(otp).trim();
  return str === "123456";
};

// ========================================
// FORMAT INDIAN PHONE
// ========================================
const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(
    /\D/g,
    ""
  );

  if (cleaned.length === 10) {
    return "+91" + cleaned;
  }

  if (
    cleaned.length === 12 &&
    cleaned.startsWith("91")
  ) {
    return "+" + cleaned;
  }

  return phone;
};
// ========================================
// SEND SMS
// ========================================
const sendSMS = async (phone, otp) => {
  try {
    const message =
      process.env.SMS_GH_OTP_TEXT.replace(
        "{{otp}}",
        otp
      );

    const response = await axios.get(
      "https://www.smsgatewayhub.com/api/mt/SendSMS",
      {
        params: {
          APIKey:
            process.env.SMS_GH_API_KEY,

          senderid:
            process.env.SMS_GH_SENDER_ID,

          channel: "2",

          DCS: 0,

          flashsms: 0,

          number: phone.replace(
            "+91",
            ""
          ),

          text: message,

          route:
            process.env.SMS_GH_ROUTE,

          EntityId:
            process.env.SMS_GH_ENTITY_ID,

          dlttemplateid:
            process.env.SMS_GH_DLT_TEMPLATE_ID,
        },
      }
    );

    console.log(
      "SMS RESPONSE:",
      response.data
    );

    if (response.data && response.data.ErrorCode !== "000") {
      console.error("SMS Gateway Hub Error Code:", response.data);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "SMS ERROR:",
      error.response?.data ||
      error.message
    );

    return false;
  }
};

// ========================================
// GENERATE USER TOKEN
// ========================================
const generateUserToken = (user, sessionId = null, platform = "web") => {
  const effectivePlatform = platform === "mobile" ? "mobile" : "web";
  const effectiveSessionId =
    sessionId ||
    user.sessions?.[effectivePlatform]?.sessionId ||
    (effectivePlatform === "web" ? user.activeSession?.sessionId : "") ||
    "";

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      sessionId: effectiveSessionId,
      platform: effectivePlatform,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
      issuer: "catchwatch",
      audience: "catchwatch-app",
    }
  );
};

// ========================================
// SEND OTP
// ========================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    // indian mobile validation
    const phoneRegex =
      /^\+91[6-9]\d{9}$/;

    if (
      !phoneRegex.test(normalizedPhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid Indian mobile number",
      });
    }

    const isDummyPhone =
      isDummyOtpPhone(normalizedPhone);

    // rate limit
    if (!isDummyPhone) {
      const recentOtp =
        await OTP.findOne({
          phone: normalizedPhone,
          createdAt: {
            $gt: new Date(
              Date.now() - 60 * 1000
            ),
          },
        });

      if (recentOtp) {
        return res.status(429).json({
          success: false,
          message:
            "Please wait before requesting another OTP",
        });
      }
    }

    const otp = isDummyPhone
      ? DUMMY_OTP_CODE
      : Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    if (isDummyPhone) {
      await User.updateOne(
        { phone: normalizedPhone },
        {
          $setOnInsert: {
            phone: normalizedPhone,
            role: "USER",
          },
        },
        { upsert: true }
      );
    } else {
      // remove old otp
      await OTP.deleteMany({
        phone: normalizedPhone,
      });

      // save new otp
      await OTP.create({
        phone: normalizedPhone,
        otp,
        expiresAt: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      });
    }

    // check if user exists
    const user = await User.findOne({
      phone: normalizedPhone,
    });

    const isNewUser =
      !user || !user.profileComplete;

    // console otp
    const smsSent =
      isDummyPhone ||
      (await sendSMS(
        normalizedPhone,
        otp
      ));

    if (!smsSent) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to send OTP",
      });
    }

    console.log(
      `📱 OTP sent to ${normalizedPhone} (Code: ${otp})`
    );

    return res.status(200).json({
      success: true,
      message:
        "OTP sent successfully",
      isNewUser,
      ...(isDummyPhone && { otp }),
    });

  } catch (error) {
    console.error(
      "SEND OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
    });
  }
};


// ========================================
// VERIFY OTP
// ========================================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Phone and OTP are required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    const normalizedOtp = String(
      otp
    ).trim();

    const isDummyOtp =
      isDummyOtpPhone(normalizedPhone) &&
      isDummyOtpCode(normalizedOtp);

    const otpRecord = isDummyOtp
      ? null
      : await OTP.findOne({
        phone: normalizedPhone,
        otp: normalizedOtp,
        expiresAt: {
          $gt: new Date(),
        },
      }).sort({
        createdAt: -1,
      });

    // wrong otp
    if (!isDummyOtp && !otpRecord) {
      const existing =
        await OTP.findOne({
          phone: normalizedPhone,
          expiresAt: {
            $gt: new Date(),
          },
        });

      if (existing) {
        existing.attempts =
          (existing.attempts || 0) + 1;

        await existing.save();

        if (existing.attempts >= 5) {
          await OTP.deleteOne({
            _id: existing._id,
          });

          return res.status(429).json({
            success: false,
            message:
              "Too many wrong attempts. Request new OTP.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    // delete otp after success
    if (otpRecord) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });
    }

    // check user
    let user = await User.findOne({
      phone: normalizedPhone,
    });

    // create user automatically
    if (!user) {
      const cleanDigits = normalizedPhone.replace(/\D/g, "").slice(-4) || Math.floor(1000 + Math.random() * 9000);
      let baseUsername = `@user_${cleanDigits}`;
      let candidateUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: candidateUsername })) {
        candidateUsername = `@user_${cleanDigits}_${counter++}`;
      }

      user = await User.create({
        phone: normalizedPhone,
        username: candidateUsername,
        name: "User",
        role: "USER",
        profileComplete: false,
      });
    } else if (!user.username) {
      const cleanDigits = normalizedPhone.replace(/\D/g, "").slice(-4) || Math.floor(1000 + Math.random() * 9000);
      let baseUsername = `@user_${cleanDigits}`;
      let candidateUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: candidateUsername, _id: { $ne: user._id } })) {
        candidateUsername = `@user_${cleanDigits}_${counter++}`;
      }
      user.username = candidateUsername;
      await user.save();
    }

    const rawFcmToken =
      req.body.fcmToken || req.body.token;

    const normalizedFcmToken =
      typeof rawFcmToken === "string"
        ? rawFcmToken.trim()
        : "";

    if (normalizedFcmToken) {
      await User.updateMany(
        {
          _id: { $ne: user._id },
          fcmToken: normalizedFcmToken,
        },
        {
          $unset: {
            fcmToken: "",
            fcmTokenUpdatedAt: "",
          },
        }
      );

      user.fcmToken = normalizedFcmToken;
      user.fcmTokenUpdatedAt = new Date();
      await user.save();
    }

    // Determine platform (web vs mobile)
    const platform = req.body.platform === "mobile" ? "mobile" : "web";
    const newSessionId = `sess_${crypto.randomBytes(16).toString("hex")}`;
    const previousSessionId =
      user.sessions?.[platform]?.sessionId ||
      (platform === "web" ? user.activeSession?.sessionId : null);

    // Revoke previous sockets for this platform only
    if (previousSessionId) {
      revokeUserSockets(user._id, platform, newSessionId);
    }

    if (!user.sessions) {
      user.sessions = {};
    }

    user.sessions[platform] = {
      sessionId: newSessionId,
      deviceId: req.body.deviceId || "",
      lastActive: new Date(),
      status: "ACTIVE",
    };

    if (platform === "web") {
      user.activeSession = {
        sessionId: newSessionId,
        deviceId: req.body.deviceId || "",
        keyId: user.e2eeIdentity?.keyId || req.body.keyId || "",
        publicKey: user.e2eeIdentity?.publicKey || req.body.publicKey || user.publicKey || "",
        lastActive: new Date(),
        status: "ACTIVE",
      };
    }

    if (req.body.publicKey && !user.e2eeIdentity?.publicKey) {
      user.publicKey = req.body.publicKey;
      if (!user.e2eeIdentity) user.e2eeIdentity = {};
      user.e2eeIdentity.publicKey = req.body.publicKey;
      user.e2eeIdentity.keyId = req.body.keyId || `key_${Date.now()}`;
    }

    await user.save();

    // generate token with sessionId and platform
    const token = generateUserToken(user, newSessionId, platform);

    const isNewUser = !user.profileComplete;

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",

      token,
      sessionId: newSessionId,
      platform,
      isNewUser,

      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profileImage:
          user.profileImage,
        profileComplete:
          user.profileComplete,
        role: user.role,
        e2eeIdentity: {
          keyId: user.e2eeIdentity?.keyId || "",
          publicKey: user.e2eeIdentity?.publicKey || user.publicKey || "",
          hasBackup: Boolean(user.e2eeIdentity?.hasBackup),
        },
        activeSession: user.sessions?.web || user.activeSession,
        sessions: user.sessions,
      },
    });

  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Verification failed",
    });
  }
};

// ========================================
// GOOGLE LOGIN
// ========================================
// exports.googleLogin = async (req, res) => {
//   try {
//     const { idToken, token, fcmToken } = req.body;

//     if (!idToken && !token) {
//       return res.status(400).json({
//         success: false,
//         message: "Google ID token is required",
//       });
//     }

//     let uid;
//     let email;
//     let name;
//     let picture;

//     if (idToken) {
//       if (!process.env.GOOGLE_CLIENT_ID) {
//         return res.status(500).json({
//           success: false,
//           message: "Google client ID is not configured",
//         });
//       }

//       const ticket = await googleClient.verifyIdToken({
//         idToken,
//         audience: process.env.GOOGLE_CLIENT_ID,
//       });

//       const payload = ticket.getPayload();

//       uid = payload.sub;
//       email = payload.email;
//       name = payload.name;
//       picture = payload.picture;
//     } else {
//       // Backward compatibility for Firebase Auth clients.
//       const decodedToken = await admin.auth().verifyIdToken(token);

//       uid = decodedToken.uid;
//       email = decodedToken.email;
//       name = decodedToken.name;
//       picture = decodedToken.picture;
//     }

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: "Google account email not found",
//       });
//     }

//     const normalizedEmail = email.toLowerCase().trim();

//     // Find existing user by Google UID or by Email
//     let user = await User.findOne({
//       $or: [
//         { googleId: uid },
//         { email: normalizedEmail }
//       ]
//     });

//     let isNewUser = false;

//     // Create new user if not exists
//     if (!user) {
//       isNewUser = true;

//       // We generate a highly unique temporary/placeholder phone string using UID and random characters
//       // to guarantee uniqueness and avoid duplicate key errors on the unique phone index.
//       const uniqueSuffix = Math.random().toString(36).substring(2, 8);
//       const tempPhone = `google_${uid.substring(0, 10)}_${uniqueSuffix}`;

//       user = await User.create({
//         name: name || "User",
//         email: normalizedEmail,
//         profileImage: picture || "",
//         googleId: uid,
//         authProvider: "GOOGLE",
//         profileComplete: true,
//         phone: tempPhone,
//       });
//     } else {
//       // If the user exists but hasn't linked Google credentials yet, link them!
//       let updated = false;
//       if (!user.googleId) {
//         user.googleId = uid;
//         updated = true;
//       }
//       if (user.authProvider !== "GOOGLE") {
//         user.authProvider = "GOOGLE";
//         updated = true;
//       }
//       if (updated) {
//         await user.save();
//       }
//     }

//     // Save FCM Token & disassociate it from any other users to prevent duplicate alerts
//     if (fcmToken && typeof fcmToken === "string") {
//       const normalizedFcmToken = fcmToken.trim();
//       if (normalizedFcmToken) {
//         await User.updateMany(
//           {
//             _id: { $ne: user._id },
//             fcmToken: normalizedFcmToken,
//           },
//           {
//             $unset: {
//               fcmToken: "",
//               fcmTokenUpdatedAt: "",
//             },
//           }
//         );

//         user.fcmToken = normalizedFcmToken;
//         user.fcmTokenUpdatedAt = new Date();
//         await user.save();
//       }
//     }

//     // Generate JWT
//     const appToken = generateUserToken(user);

//     return res.status(200).json({
//       success: true,
//       message: "Google login successful",
//       token: appToken,
//       isNewUser,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         profileImage: user.profileImage,
//         role: user.role,
//       },
//     });

//   } catch (error) {
//     console.error("GOOGLE LOGIN ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Google login failed",
//     });
//   }
// };

exports.refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const platform = req.user.platform === "mobile" ? "mobile" : "web";
    const sessionId = req.user.sessionId || user.sessions?.[platform]?.sessionId || "";
    const token = generateUserToken(user, sessionId, platform);

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      token,
      sessionId,
      platform,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
        role: user.role,
        e2eeIdentity: {
          keyId: user.e2eeIdentity?.keyId || "",
          publicKey: user.e2eeIdentity?.publicKey || user.publicKey || "",
          hasBackup: Boolean(user.e2eeIdentity?.hasBackup),
        },
        activeSession: user.sessions?.web || user.activeSession,
        sessions: user.sessions,
      },
    });
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user?.id) {
      const platform = req.user.platform === "mobile" ? "mobile" : "web";
      const updateDoc = {
        [`sessions.${platform}.status`]: "REVOKED",
        isOnline: false,
        lastSeen: new Date(),
      };
      if (platform === "web") {
        updateDoc["activeSession.status"] = "REVOKED";
      }

      await User.findByIdAndUpdate(req.user.id, updateDoc);
      revokeUserSockets(req.user.id, platform);
    }

    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

exports.getSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("sessions activeSession e2eeIdentity");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const platform = req.user.platform === "mobile" ? "mobile" : "web";
    const currentSession = user.sessions?.[platform] || (platform === "web" ? user.activeSession : null);

    const isActive =
      Boolean(req.user?.sessionId) &&
      currentSession?.sessionId === req.user.sessionId &&
      currentSession?.status === "ACTIVE";

    return res.status(200).json({
      success: true,
      data: {
        platform,
        currentSession,
        isActive,
        e2eeIdentity: {
          keyId: user.e2eeIdentity?.keyId || "",
          publicKey: user.e2eeIdentity?.publicKey || "",
          hasBackup: Boolean(user.e2eeIdentity?.hasBackup),
        },
      },
    });
  } catch (error) {
    console.error("GET SESSION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get session",
    });
  }
};
// ========================================
// CANCEL INCOMPLETE REGISTRATION
// ========================================
exports.cancelRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "User not found or already removed",
      });
    }

    // Only allow cancelling if profile is NOT complete
    if (!user.profileComplete) {
      await User.findByIdAndDelete(userId);
      return res.status(200).json({
        success: true,
        message: "Incomplete registration cancelled and user removed successfully",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Cannot cancel an already completed user profile",
    });
  } catch (error) {
    console.error("Cancel registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error cancelling registration",
    });
  }
};
