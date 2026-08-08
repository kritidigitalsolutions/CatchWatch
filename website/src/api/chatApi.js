import axiosInstance from "./axiosConfig";

export const getConversations = async () => {
  const res = await axiosInstance.get("/chat/conversations");
  return res.data;
};

export const startConversation = async (recipientId) => {
  const res = await axiosInstance.post("/chat/conversations", { recipientId });
  return res.data;
};

export const getMessages = async (conversationId, page = 1, limit = 50) => {
  const res = await axiosInstance.get(
    `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
  );
  return res.data;
};

export const sendMessage = async (messageData) => {
  const res = await axiosInstance.post("/chat/messages", messageData);
  return res.data;
};

export const uploadChatMedia = async (formData) => {
  const res = await axiosInstance.post("/chat/messages/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const editMessage = async (messageId, text) => {
  const res = await axiosInstance.put(`/chat/messages/${messageId}`, { text });
  return res.data;
};

export const unsendMessage = async (messageId) => {
  const res = await axiosInstance.post(`/chat/messages/${messageId}/unsend`, {});
  return res.data;
};

export const deleteMessageForMe = async (messageId) => {
  const res = await axiosInstance.delete(`/chat/messages/${messageId}`);
  return res.data;
};

export const toggleReaction = async (messageId, emoji) => {
  const res = await axiosInstance.post(`/chat/messages/${messageId}/react`, { emoji });
  return res.data;
};

export const markAsRead = async (conversationId) => {
  const res = await axiosInstance.post(`/chat/conversations/${conversationId}/read`, {});
  return res.data;
};

export const pinConversation = async (conversationId) => {
  const res = await axiosInstance.post(`/chat/conversations/${conversationId}/pin`, {});
  return res.data;
};

export const clearConversation = async (conversationId) => {
  const res = await axiosInstance.delete(`/chat/conversations/${conversationId}`);
  return res.data;
};

export const searchMessages = async (query, conversationId = null) => {
  let url = `/chat/messages/search?q=${encodeURIComponent(query)}`;
  if (conversationId) url += `&conversationId=${conversationId}`;
  const res = await axiosInstance.get(url);
  return res.data;
};

export const blockUser = async (userId) => {
  const res = await axiosInstance.post(`/chat/block/${userId}`, {});
  return res.data;
};

export const unblockUser = async (userId) => {
  const res = await axiosInstance.delete(`/chat/block/${userId}`);
  return res.data;
};

export const getBlockedUsers = async () => {
  const res = await axiosInstance.get("/chat/blocked-users");
  return res.data;
};

export const searchChatUsers = async (query) => {
  const res = await axiosInstance.get(
    `/chat/users/search?q=${encodeURIComponent(query)}`
  );
  return res.data;
};

export const getUserStatus = async (userId) => {
  const res = await axiosInstance.get(`/chat/users/${userId}/status`);
  return res.data;
};

export const updateFcmToken = async (fcmToken) => {
  const res = await axiosInstance.post("/chat/fcm-token", { fcmToken });
  return res.data;
};
