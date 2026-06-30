import api from './axiosConfig';

export const movieApi = {
  getAllMovies: async (genre = 'All', sort = 'trending') => {
    try {
      const response = await api.get('/movies', {
        params: { genre, sort },
      });

      return response.data.movies || [];
    } catch (error) {
      console.error('Error fetching all movies:', error);
      throw error;
    }
  },

  getMovieBySlug: async (slug) => {
    try {
      const response = await api.get(`/movies/slug/${slug}`);
      return response.data.movie || response.data;
    } catch (error) {
      console.error(`Error fetching movie with slug ${slug}:`, error);
      throw error;
    }
  },

  getMovieById: async (id) => {
    try {
      const response = await api.get(`/movies/id/${id}`);
      return response.data.movie || response.data;
    } catch (error) {
      console.error(`Error fetching movie with ID ${id}:`, error);
      throw error;
    }
  },
};
