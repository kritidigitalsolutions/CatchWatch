import axiosInstance from "./axiosConfig";
// "endpoint": "/api/auth/send-otp"
// "endpoint": "/api/auth/verify-otp"
// "endpoint": "/api/auth/google-login"
// "endpoint": "/api/auth/logout"


export const auth = async (data) => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", data);
    return response.data;

  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error
  }
}

export const verifyOTP = async (data) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", data);
    return response.data;
  } catch (error) {
    console.error("error to fetching otp", error)
  }
}

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post("/auth/logout");
    return response.data;
  } catch (error) {
    console.error("Error logging out:", error);
  }
};

export const refreshTokenCall = async () => {
  try {
    const response = await axiosInstance.post("/auth/refresh-token");
    return response.data;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
};


