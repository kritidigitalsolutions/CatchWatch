import axiosInstance from "./axiosConfig";

export const getAllContent = async (params = {}) => {
  const response = await axiosInstance.get("/content", { params });
  return response.data;
};

export const searchContent = async (params = {}) => {
  const response = await axiosInstance.get("/content/search", { params });
  return response.data;
};