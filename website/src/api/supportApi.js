import axiosInstance from "./axiosConfig";

export const getHelpCategories = async () => {
  const response = await axiosInstance.get("/help");
  return response.data;
};

export const getHelpByCategory = async (category) => {
  const response = await axiosInstance.get(`/help/${category}`);
  return response.data;
};

export const createSupportTicket = async (data) => {
  const response = await axiosInstance.post("/support", data);
  return response.data;
};

export const getUserSupportTickets = async (params = {}) => {
  const response = await axiosInstance.get("/support", { params });
  return response.data;
};

export const getSupportTicketById = async (id) => {
  const response = await axiosInstance.get(`/support/${id}`);
  return response.data;
};

export const replyToSupportTicket = async (id, data) => {
  const response = await axiosInstance.post(`/support/reply/${id}`, data);
  return response.data;
};

export const getTicketConversation = async (id) => {
  const response = await axiosInstance.get(`/support/conversation/${id}`);
  return response.data;
};

// ========================================
// VIP SUPPORT API (BLUETICK RESTRICTED)
// ========================================
export const checkVipAccess = async () => {
  const response = await axiosInstance.get("/support/vip/access-check");
  return response.data;
};

export const createVipSupportTicket = async (data) => {
  const response = await axiosInstance.post("/support/vip", data);
  return response.data;
};

export const getVipSupportTickets = async () => {
  const response = await axiosInstance.get("/support/vip");
  return response.data;
};

export const getVipTicketById = async (id) => {
  const response = await axiosInstance.get(`/support/vip/${id}`);
  return response.data;
};

export const replyToVipTicket = async (id, data) => {
  const response = await axiosInstance.post(`/support/vip/reply/${id}`, data);
  return response.data;
};