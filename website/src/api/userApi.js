import axiosInstance from "./axiosConfig";

// Get logged-in user's profile details
export const getUserProfile = async () => {
  try {
    const response = await axiosInstance.get("/user/profile");
    if (response && response.user) {
      localStorage.setItem("userIsPremium", response.user.isPremium ? "true" : "false");
    } else if (response && response.data && response.data.user) {
      localStorage.setItem("userIsPremium", response.data.user.isPremium ? "true" : "false");
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

// Complete user profile (with file upload support)
export const completeProfile = async (formData) => {
  try {
    const response = await axiosInstance.post("/user/complete-profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error completing profile:", error);
    throw error;
  }
};

// Update user profile (with file upload support)
export const updateProfile = async (formData) => {
  try {
    const response = await axiosInstance.patch("/user/update-profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

// Save Firebase Cloud Messaging (FCM) Token
export const saveFcmToken = async (data) => {
  try {
    const response = await axiosInstance.patch("/user/fcm-token", data);
    return response.data;
  } catch (error) {
    console.error("Error saving FCM token:", error);
    throw error;
  }
};

// Get User Profile Stats
export const getProfileStats = async (userId) => {
  try {
    const response = await axiosInstance.get(`/user/profile-stats/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching profile stats:", error);
    throw error;
  }
};

// Get Public User Profile (by ID or Username)
export const getPublicUserProfile = async (identifier) => {
  try {
    const response = await axiosInstance.get(`/user/profile-details/${identifier}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching public user profile:", error);
    throw error;
  }
};

// Follow User
export const followUser = async (targetUserId) => {
  try {
    const response = await axiosInstance.post(`/user/follow/${targetUserId}`);
    return response.data;
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

// Unfollow User
export const unfollowUser = async (targetUserId) => {
  try {
    const response = await axiosInstance.post(`/user/unfollow/${targetUserId}`);
    return response.data;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

// Toggle Follow User
export const toggleFollowUser = async (targetUserId) => {
  try {
    const response = await axiosInstance.post(`/user/toggle-follow/${targetUserId}`);
    return response.data;
  } catch (error) {
    console.error("Error toggling follow user:", error);
    throw error;
  }
};

// Get User Followers List
export const getUserFollowers = async (userId, page = 1, limit = 20) => {
  try {
    const response = await axiosInstance.get(`/user/followers/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user followers:", error);
    throw error;
  }
};

// Get User Following List
export const getUserFollowing = async (userId, page = 1, limit = 20) => {
  try {
    const response = await axiosInstance.get(`/user/following/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user following:", error);
    throw error;
  }
};

// Get User Posts / Reels
export const getUserPosts = async (userId, page = 1, limit = 20) => {
  try {
    const response = await axiosInstance.get(`/user/posts/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user posts:", error);
    throw error;
  }
};

// Apply Profile Verification
export const applyVerification = async (formData) => {
  try {
    const response = await axiosInstance.post("/verification/apply", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error applying verification:", error);
    throw error;
  }
};

// Get Verification Status
export const getVerificationStatus = async () => {
  try {
    const response = await axiosInstance.get("/verification/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching verification status:", error);
    throw error;
  }
};

// Cancel Verification Request
export const cancelVerification = async () => {
  try {
    const response = await axiosInstance.put("/verification/cancel");
    return response.data;
  } catch (error) {
    console.error("Error cancelling verification:", error);
    throw error;
  }
};

// Search Users with Priority Ordering
export const searchUsers = async (query) => {
  try {
    const response = await axiosInstance.get(`/user/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

// Creator Wallet API
export const getCreatorWallet = async () => {
  try {
    const response = await axiosInstance.get("/creator/wallet");
    return response.data;
  } catch (error) {
    console.error("Error fetching creator wallet:", error);
    throw error;
  }
};

// Creator Redeem Request API
export const requestRedeem = async (redeemData) => {
  try {
    const payload = typeof redeemData === "number" ? { points: redeemData } : redeemData;
    const response = await axiosInstance.post("/creator/redeem", payload);
    return response.data;
  } catch (error) {
    console.error("Error requesting redeem:", error);
    throw error;
  }
};

// Creator Redeem History API
export const getRedeemHistory = async () => {
  try {
    const response = await axiosInstance.get("/creator/redeem/history");
    return response.data;
  } catch (error) {
    console.error("Error fetching redeem history:", error);
    throw error;
  }
};

// Creator Points API
export const getCreatorPoints = async () => {
  try {
    const response = await axiosInstance.get("/creator/points");
    return response.data;
  } catch (error) {
    console.error("Error fetching creator points:", error);
    throw error;
  }
};

// Creator Point History API
export const getPointHistory = async () => {
  try {
    const response = await axiosInstance.get("/creator/point-history");
    return response.data;
  } catch (error) {
    console.error("Error fetching point history:", error);
    throw error;
  }
};

// Creator Dashboard API
export const getCreatorDashboard = async () => {
  try {
    const response = await axiosInstance.get("/creator/dashboard");
    return response.data;
  } catch (error) {
    console.error("Error fetching creator dashboard:", error);
    throw error;
  }
};