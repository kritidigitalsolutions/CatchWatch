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