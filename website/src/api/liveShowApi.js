import axiosInstance from "./axiosConfig";

/**
 * Fetch all active live shows & streams
 * @param {Object} params - { status: 'LIVE' | 'UPCOMING' | 'ENDED' | 'ALL', category, search, page, limit }
 */
export const getActiveLiveShows = async (params = {}) => {
  try {
    const res = await axiosInstance.get("/live-shows", { params });
    return res.data;
  } catch (error) {
    console.error("getActiveLiveShows error:", error);
    throw error;
  }
};

/**
 * Fetch top featured live show
 */
export const getFeaturedLiveShow = async () => {
  try {
    const res = await axiosInstance.get("/live-shows/featured");
    return res.data;
  } catch (error) {
    console.error("getFeaturedLiveShow error:", error);
    throw error;
  }
};

/**
 * Fetch single live show details by ID
 */
export const getLiveShowDetails = async (id) => {
  try {
    const res = await axiosInstance.get(`/live-shows/${id}`);
    return res.data;
  } catch (error) {
    console.error("getLiveShowDetails error:", error);
    throw error;
  }
};

/**
 * Ping viewer heartbeat (increments viewer counter)
 */
export const pingLiveShowViewer = async (id) => {
  try {
    const res = await axiosInstance.post(`/live-shows/${id}/view`);
    return res.data;
  } catch (error) {
    console.error("pingLiveShowViewer error:", error);
    return null;
  }
};
