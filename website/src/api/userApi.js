import axiosInstance from "./axiosConfig";

// Get logged-in user's profile details
export const getUserProfile = async () => {
  try {
    const response = await axiosInstance.get("/user/profile");
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