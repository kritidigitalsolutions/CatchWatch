import axiosInstance from "./axiosConfig";


export const getAllEpisodesByTvShowId = async (tvShowId) => {
  try {
    const response = await axiosInstance.get(`/tv-shows-episodes/${tvShowId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Tvshoes with ID ${tvShowId} from API:`, error);
    throw error;
  }
};

// export const getAllEpisodesByTvShowId = ... (Ye aapka pehle se hai)

export const getEpisodeById = async (id) => {
  try {
    // Check karein ki aapka backend url yahi hai
    const response = await axiosInstance.get(`/tv-shows-episodes/single/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching episode with ID ${id} from API:`, error);
    throw error;
  }
};
