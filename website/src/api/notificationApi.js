import axiosInstance from "./axiosConfig";

export const saveFcmToken = async (data) => {
  const response = await axiosInstance.post("/notifications/fcm-token", data);
  return response.data;
};

export const getNotifications = async (params = {}) => {
  const response = await axiosInstance.get("/notifications", { params });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await axiosInstance.get("/notifications/unread-count");
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await axiosInstance.patch("/notifications/read-all");
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await axiosInstance.patch(`/notifications/${id}/read`);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await axiosInstance.delete(`/notifications/${id}`);
  return response.data;
};