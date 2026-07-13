import axiosInstance from "./axiosConfig";

/**
 * Fetch all movies with support for pagination (page, limit).
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise<Object>} API response
 */
export const getShortFilms = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/short-films", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching movies from API:", error);
    throw error;
  }
};

/**
 * Fetch a single movie by its slug.
 * @param {string} slug - Movie slug
 * @returns {Promise<Object>} API response
 */
export const getShortFilmsBySlug = async (slug) => {
  try {
    const response = await axiosInstance.get(`/short-films/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching movie with slug ${slug} from API:`, error);
    throw error;
  }
};

/**
 * Fetch a single movie by its ID.
 * @param {string} id - Movie ID
 * @returns {Promise<Object>} API response
 */
export const getShortFilmsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/short-films/id/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching movie with ID ${id} from API:`, error);
    throw error;
  }
};
