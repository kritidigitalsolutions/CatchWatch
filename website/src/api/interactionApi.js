import axiosInstance from "./axiosConfig";

// Agar aapke backend 'app.js' me prefix kuch aur hai (e.g. /api/action), toh yahan update karein.
const PREFIX = "/interaction"; // <-- Isko apne backend base route se match karein

export const toggleLike = async (contentId) => {
  const response = await axiosInstance.post(`${PREFIX}/toggle/like/${contentId}`);
  return response.data;
};

export const toggleDislike = async (contentId) => {
  const response = await axiosInstance.post(`${PREFIX}/toggle/dislike/${contentId}`);
  return response.data;
};

export const getContentInteractions = async (contentId) => {
  const response = await axiosInstance.get(`${PREFIX}/stats/${contentId}`);
  return response.data;
};

export const toggleBookmark = async (contentId) => {
  const response = await axiosInstance.post(`${PREFIX}/toggle/bookmark/${contentId}`);
  return response.data;
};

export const getBookmarks = async () => {
  const response = await axiosInstance.get(`${PREFIX}/bookmarks`);
  return response.data;
};