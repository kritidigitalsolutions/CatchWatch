import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaPlay } from "react-icons/fa";
import Loader from '../components/Loader';
import { getMovies } from '../api/movieApi'; // API import added

const ContentExplorerPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Detect context type from query params (e.g., /explore?context=trending)
  const queryParams = new URLSearchParams(location.search);
  const pageContext = queryParams.get('context') || 'Recommended';

  // Filter State Parameters
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedType, setSelectedType] = useState('All'); // Will work if backend adds 'type' field
  const [sortBy, setSortBy] = useState('popular');

  // Dynamic Data States
  const [catalogItems, setCatalogItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=500&auto=format&fit=crop";

  // Hook to fetch backend data
  useEffect(() => {
    const fetchExplorerData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetching all movies. Filtering and sorting will be applied client-side below.
        // You can also pass query params to getMovies if your backend supports it.
        const response = await getMovies({ limit: 100 });
        const movies = response?.movies || response || [];
        setCatalogItems(movies);
      } catch (err) {
        console.error(`API Error: Fetching ${pageContext} data failed:`, err);
        setError("Failed to load content from the server.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplorerData();
  }, [pageContext]);

  // -------------------------------------------------------------
  // Client-Side Advanced Filtering & Sorting Algorithm
  // -------------------------------------------------------------
  const filteredMovies = catalogItems.filter(item => {
    // 1. Context Filter (Trending, Top10, etc.)
    const ctx = pageContext.toLowerCase();
    if (ctx === 'trending' && !item?.category?.includes('trending')) return false;
    if (ctx === 'top10' && !item?.category?.includes('top10')) return false;
    // Note: If context is 'recommended', you can adjust the logic as needed (e.g., not trending and not top10)

    // 2. Genre Specification Filter
    if (selectedGenre !== 'All' && (!item.genre || !item.genre.includes(selectedGenre))) return false;

    // 3. Media Classification Type Filter (Fallback safe if 'type' doesn't exist in DB yet)
    if (selectedType !== 'All' && item.type && item.type !== selectedType) return false;

    return true;
  }).sort((a, b) => {
    // 4. Sort Sequences
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0); // High to Low Rating
    }
    if (sortBy === 'newest') {
      return (b.releaseYear || 0) - (a.releaseYear || 0); // Newest First
    }
    // Default 'popular': Can be mapped to priority, views, or just default API order
    return (a.priority || 0) - (b.priority || 0);
  });


  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="text-center p-20 text-white flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
        <p className="text-gray-500">{error}</p>
        <button onClick={() => navigate(-1)} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full py-6">

      {/* Dynamic Header Segment */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-brand-orange font-bold text-sm mb-1 hover:underline flex items-center gap-1">
            ← Go Back
          </button>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight capitalize">
            Discover {pageContext} Content
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Explore comprehensive system media catalogs filtered in real-time.</p>
        </div>

        <div className="bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-orange-100 self-start sm:self-auto">
          Displaying {filteredMovies.length} Matches
        </div>
      </div>

      {/* Advanced Filter Management Console Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Media Format</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="All">All Formats</option>
            <option value="Movie">Cinematic Movies</option>
            <option value="TV Show">TV Shows</option>
            <option value="Short Film">Short Films / Reels</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Genre Specification</label>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="All">All Genres</option>
            <option value="Horror">Horror</option>
            <option value="Action">Action</option>
            <option value="Drama">Drama</option>
            <option value="Thriller">Thriller</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Comedy">Comedy</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sort Sequences</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="popular">System Metrics: High Popularity</option>
            <option value="rating">Critic Review: High Rating</option>
            <option value="newest">Chronological Row: Newest First</option>
          </select>
        </div>
      </div>

      {/* Dynamic Grid Distribution Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {filteredMovies.map((movie) => (
          <div
            key={movie._id}
            onClick={() => navigate(`/watch/${movie.slug}`)}
            className="relative bg-white border border-gray-100 rounded-2xl p-2.5 shadow-sm group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Premium Badge */}
              {movie.isPremium && (
                <span className="absolute top-4 left-4 z-10 bg-brand-orange text-[8px] text-white font-black tracking-widest px-2 py-0.5 rounded shadow-md uppercase">
                  Premium
                </span>
              )}

              {/* Immersive Poster Image Box */}
              <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                <img
                  src={movie.poster && movie.poster.trim() !== "" ? movie.poster : FALLBACK_POSTER}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-11 h-11 bg-brand-orange text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <FaPlay />
                  </div>
                </div>
              </div>

              {/* Text Metadata Details Layer */}
              <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors duration-200 px-0.5">
                {movie.title}
              </div>
              <div className="text-[11px] text-gray-400 font-bold mt-0.5 px-0.5 truncate">
                {movie.genre?.length > 0 ? movie.genre.join(" / ") : "Uncategorized"} {movie.releaseYear ? `• ${movie.releaseYear}` : ''}
              </div>
            </div>

            {/* Dynamic Score Badge Layer Row Footer */}
            <div className="mt-3 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg text-[10px] font-black text-brand-orange w-max flex items-center gap-1">
              ⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}
            </div>
          </div>
        ))}

        {/* Empty Query Matrix Feedback Block State */}
        {filteredMovies.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-16 text-center text-sm font-semibold text-gray-400 shadow-sm">
            No movie productions matching the current filter sequences exist in the database.
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentExplorerPage;