// import axiosInstance from "./axiosConfig";

// export const toggleInteraction = async (data) => {
//   const response = await axiosInstance.post("/api/interaction/toggle", data);
//   return response.data;
// };

// export const getInteractionStatus = async (contentId) => {
//   const response = await axiosInstance.get(`/api/interaction/status/${contentId}`);
//   return response.data;
// };

// export const getInteractionStats = async (contentId) => {
//   const response = await axiosInstance.get(`/api/interaction/stats/${contentId}`);
//   return response.data;
// };

// export const rateContent = async (data) => {
//   const response = await axiosInstance.post("/api/rating/rate", data);
//   return response.data;
// };

// export const getAllRatings = async (params = {}) => {
//   const response = await axiosInstance.get("/api/rating/all", { params });
//   return response.data;
// };