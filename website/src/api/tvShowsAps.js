import axiosInstance from "./axiosConfig";
/**
 * Fetch all movies with support for pagination (page, limit).
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise<Object>} API response
 */
export const getTvShows = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/tv-shows", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching TvShows from API:", error);
    throw error;
  }
};

export const searchTvShows = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/tv-shows", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching TvShows from API:", error);
    throw error;
  }
};

export const getTvShowsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/tv-shows/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Tvshoes with ID ${id} from API:`, error);
    throw error;
  }
};
