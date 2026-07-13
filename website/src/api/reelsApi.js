import axiosInstance from "./axiosConfig";

export const uploadReel = async (data) => {
  const response = await axiosInstance.post("/reels/upload", data);
  return response.data;
};

export const getReelsFeed = async (params = {}) => {
  const response = await axiosInstance.get("/reels/feed", { params });
  return response.data;
};

export const getReelById = async (id) => {
  const response = await axiosInstance.get(`/reels/${id}`);
  return response.data;
};

export const deleteReel = async (id) => {
  const response = await axiosInstance.delete(`/reels/${id}`);
  return response.data;
};

// Sirf logged-in user ki reels fetch karne ke liye
export const getMyReels = async () => {
  const response = await axiosInstance.get("/reels/my-reels");
  return response.data;
};
// // 1. Get Single Reel by ID
// export const getReelById = async (id) => {
//   const response = await axiosInstance.get(`/reels/${id}`);
//   return response.data;
// };

// 2. Increment Views (Jab video play ho)
export const incrementViews = async (id) => {
  const response = await axiosInstance.post(`/reels/${id}/view`);
  return response.data;
};

// 3. Increment Shares
export const incrementShares = async (id) => {
  const response = await axiosInstance.post(`/reels/${id}/share`);
  return response.data;
};