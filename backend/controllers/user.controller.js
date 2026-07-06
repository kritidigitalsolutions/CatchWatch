const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) return "+91" + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return "+" + cleaned;
  return phone;
};

const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role || "USER",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};


const Subscription = require("../models/subscription.model");
const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

const decorateUserWithSubscription = async (userObj) => {
  if (!userObj) return null;
  const user = userObj.toObject ? userObj.toObject() : userObj;
  try {
    let activeSub = await Subscription.findOne({
      user: user._id || user.id,
      status: "active",
    }).populate("plan");
    
    activeSub = await expireSubscriptionIfNeeded(activeSub);
    
    user.isPremium = !!(activeSub && activeSub.status === "active");
    user.planId = activeSub ? activeSub.plan?._id : null;
    user.subscription = activeSub || null;
  } catch (error) {
    console.error("Error decorating user with subscription:", error);
    user.isPremium = false;
    user.planId = null;
    user.subscription = null;
  }
  return user;
};


// ========================================
// GET PROFILE
// ========================================
exports.getProfile = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.user.id
    ).select("-__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const decoratedUser = await decorateUserWithSubscription(user);

    res.status(200).json({
      success: true,
      user: decoratedUser,
    });

  } catch (error) {
    console.error(
      "Get Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// COMPLETE PROFILE
// ========================================
exports.completeProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      username,
      genres,
      bio,
      phone,
    } = req.body;

    let user = null;

    // Try to retrieve token and verify user ID if token is provided
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (err) {
        // Invalid token
      }
    }

    // If no user by token, but phone is provided
    if (!user && phone) {
      const normalizedPhone = formatIndianPhone(phone);
      user = await User.findOne({ phone: normalizedPhone });
      if (!user) {
        // Create user shell (but not saved yet, we will validate and save it below)
        user = new User({
          phone: normalizedPhone,
          genres: ["Drama"],
        });
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found or phone number is required",
      });
    }

    // BLOCK SECOND TIME COMPLETION
    if (user.profileComplete) {
      return res.status(400).json({
        success: false,
        message: "Profile already completed. Use update-profile API.",
      });
    }

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Validate username (must start with @)
    if (!username || typeof username !== "string") {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }
    let formattedUsername = username.trim();
    if (!formattedUsername.startsWith("@")) {
      formattedUsername = "@" + formattedUsername;
    }
    if (!/^@[a-zA-Z0-9_]+$/.test(formattedUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must start with @ and contain only letters, numbers and underscores",
      });
    }

    // Check username unique
    const existingUsername = await User.findOne({ username: formattedUsername });
    if (existingUsername && existingUsername._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Username already in use",
      });
    }

    // Validate genres
    if (!genres) {
      return res.status(400).json({
        success: false,
        message: "Genres are required",
      });
    }
    let genresArray = genres;
    if (typeof genres === "string") {
      try {
        genresArray = JSON.parse(genres);
      } catch {
        genresArray = genres.split(",").map((g) => g.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(genresArray) || genresArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one genre is required",
      });
    }



    // update fields
    user.name = name.trim();
    user.username = formattedUsername;
    user.genres = genresArray;

    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    // handle profile image (defaults to empty string for firebase compatibility)
    if (req.file) {
      user.profileImage = req.file.path.replace(/\\/g, "/");
    } else {
      user.profileImage = user.profileImage || "";
    }

    user.profileComplete = true;

    await user.save();

    const appToken = generateUserToken(user);

    res.cookie("token", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      token: appToken,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
        role: user.role || "USER",
      },
    });

  } catch (error) {
    console.error(
      "Complete Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// UPDATE PROFILE
// ========================================
exports.updateProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      username,
      phone,
      genres,
      bio,
    } = req.body;

    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // update phone
    if (phone) {
      const formatIndianPhone = (phoneNum) => {
        const cleaned = String(phoneNum).replace(/\D/g, "");
        if (cleaned.length === 10) return "+91" + cleaned;
        if (cleaned.length === 12 && cleaned.startsWith("91")) return "+" + cleaned;
        return phoneNum;
      };
      const normalizedPhone = formatIndianPhone(phone);
      const phoneRegex = /^\+91[6-9]\d{9}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Enter valid 10-digit Indian mobile number",
        });
      }
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone && existingPhone._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use",
        });
      }
      user.phone = normalizedPhone;
    }



    // update username
    if (username) {
      let formattedUsername = username.trim();
      if (!formattedUsername.startsWith("@")) {
        formattedUsername = "@" + formattedUsername;
      }
      if (!/^@[a-zA-Z0-9_]+$/.test(formattedUsername)) {
        return res.status(400).json({
          success: false,
          message:
            "Username must start with @ and contain only letters, numbers and underscores",
        });
      }
      const existingUsername = await User.findOne({ username: formattedUsername });
      if (existingUsername && existingUsername._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Username already in use",
        });
      }
      user.username = formattedUsername;
    }

    // update genres
    if (genres) {
      let genresArray = genres;
      if (typeof genres === "string") {
        try {
          genresArray = JSON.parse(genres);
        } catch {
          genresArray = genres.split(",").map((g) => g.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(genresArray) || genresArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one genre is required",
        });
      }
      user.genres = genresArray;
    }

    // update name
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // update bio
    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    // handle profile image
    if (req.file) {
      user.profileImage = req.file.path.replace(/\\/g, "/");
    }

    await user.save();

    const decoratedUser = await decorateUserWithSubscription(user);

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user: decoratedUser,
    });

  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// SAVE FCM TOKEN
// ========================================
exports.saveFcmToken = async (req, res) => {
  try {
    const rawToken = req.body.fcmToken || req.body.token;
    const fcmToken =
      typeof rawToken === "string"
        ? rawToken.trim()
        : "";

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.updateMany(
      {
        _id: { $ne: user._id },
        fcmToken,
      },
      {
        $unset: {
          fcmToken: "",
          fcmTokenUpdatedAt: "",
        },
      }
    );

    user.fcmToken = fcmToken;
    user.fcmTokenUpdatedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "FCM token connected to user successfully",
      userId: user._id,
      hasFcmToken: true,
    });
  } catch (error) {
    console.error("Save FCM Token Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET PROFILE STATS
// ========================================
exports.getProfileStats = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const User = require("../models/user.model");
    const Reel = require("../models/reel.model");
    const Interaction = require("../models/interaction.model");

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 1. totalReels: count active reels uploaded by user
    const totalReels = await Reel.countDocuments({
      user: userId,
      status: "ACTIVE",
    });

    // Find all active reel IDs for this user
    const reels = await Reel.find({
      user: userId,
      status: "ACTIVE",
    }).select("_id").lean();
    const reelIds = reels.map(r => r._id);

    // 2. totalLikes: likes received on user's reels
    // 3. totalDislikes: dislikes received on user's reels
    let totalLikes = 0;
    let totalDislikes = 0;

    if (reelIds.length > 0) {
      const counts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: { $in: ["like", "dislike"] },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]);

      counts.forEach(c => {
        if (c._id === "like") totalLikes = c.count;
        if (c._id === "dislike") totalDislikes = c.count;
      });
    }

    // 4. followers: follow interactions targetting this userId
    const followers = await Interaction.countDocuments({
      contentId: userId,
      contentType: "user",
      type: "follow",
    });

    // 5. following: follow interactions initiated by this userId
    const following = await Interaction.countDocuments({
      user: userId,
      contentType: "user",
      type: "follow",
    });

    return res.status(200).json({
      success: true,
      totalReels,
      totalLikes,
      totallLikes: totalLikes, // support double-l typo from client spec
      totalDislikes,
      followers,
      following,
    });
  } catch (error) {
    console.error("Get Profile Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
