import axiosInstance from "./axiosConfig";

/**
 * Fetch all active live cricket matches
 * @param {Object} params - { status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'ALL', tournament, format, limit }
 */
export const getActiveMatches = async (params = {}) => {
  try {
    const res = await axiosInstance.get("/live-matches", { params });
    return res.data;
  } catch (error) {
    console.error("getActiveMatches error:", error);
    throw error;
  }
};

/**
 * Fetch the top featured live cricket match
 */
export const getFeaturedMatch = async () => {
  try {
    const res = await axiosInstance.get("/live-matches/featured");
    return res.data;
  } catch (error) {
    console.error("getFeaturedMatch error:", error);
    throw error;
  }
};

/**
 * Fetch single match details by ID
 */
export const getMatchDetails = async (id) => {
  try {
    const res = await axiosInstance.get(`/live-matches/${id}`);
    return res.data;
  } catch (error) {
    console.error("getMatchDetails error:", error);
    throw error;
  }
};

/**
 * Fetch detailed match scorecard
 */
export const getMatchScorecard = async (id) => {
  try {
    const res = await axiosInstance.get(`/live-matches/${id}/scorecard`);
    return res.data;
  } catch (error) {
    console.error("getMatchScorecard error:", error);
    throw error;
  }
};

/**
 * Fetch match commentary feed
 */
export const getMatchCommentary = async (id, limit = 30) => {
  try {
    const res = await axiosInstance.get(`/live-matches/${id}/commentary`, { params: { limit } });
    return res.data;
  } catch (error) {
    console.error("getMatchCommentary error:", error);
    throw error;
  }
};

/**
 * Ping viewer heartbeat
 */
export const pingViewer = async (id) => {
  try {
    const res = await axiosInstance.post(`/live-matches/${id}/view`);
    return res.data;
  } catch (error) {
    console.error("pingViewer error:", error);
    return null;
  }
};
