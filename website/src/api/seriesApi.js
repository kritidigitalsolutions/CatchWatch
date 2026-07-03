import axiosInstance from "./axiosConfig";

export const getSeries = async (params = {}) => {
  const response = await axiosInstance.get("/series", { params });
  return response.data;
};

export const getSeriesBySlug = async (slug) => {
  const response = await axiosInstance.get(`/series/slug/${slug}`);
  return response.data;
};

export const getSeriesById = async (id) => {
  const response = await axiosInstance.get(`/series/${id}`);
  return response.data;
};

export const getEpisodesBySeriesId = async (seriesId) => {
  const response = await axiosInstance.get(`/series/episodes/${seriesId}`);
  return response.data;
};