import axiosInstance from "./axiosConfig";

export const getWatchlist = async () => {
  const response = await axiosInstance.get("/watchlist");
  return response.data;
};

export const addToWatchlist = async (data) => {
  const response = await axiosInstance.post("/watchlist", data);
  return response.data;
};

export const removeFromWatchlist = async (id) => {
  const response = await axiosInstance.delete(`/watchlist/${id}`);
  return response.data;
};