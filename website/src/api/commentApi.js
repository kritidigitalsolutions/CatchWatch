import axiosInstance from "./axiosConfig";

const PREFIX = "/comments";

export const addComment = async (contentId, data) => {
  const response = await axiosInstance.post(`${PREFIX}/${contentId}`, data);
  return response.data;
};

export const getComments = async (contentId) => {
  const response = await axiosInstance.get(`${PREFIX}/${contentId}`);
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await axiosInstance.delete(`${PREFIX}/${commentId}`);
  return response.data;
};

export const pinComment = async (commentId, isPinned) => {
  const response = await axiosInstance.post(`${PREFIX}/pin/${commentId}`, { isPinned });
  return response.data;
};