import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay } from "react-icons/fa";
import Loader from '../components/Loader';
import { getMovies } from '../api/movieApi'; // Aapki API import

const RecommendedPage = () => {
  const navigate = useNavigate();

  const isComingSoon = (movie) => {
    return movie?.isComingSoon === true || movie?.isComingSoon === "true";
  };

  // Dynamic States
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop";

  useEffect(() => {
    const fetchRecommended = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // API se sabhi movies fetch karein
        const response = await getMovies({ limit: 100 });
        const allMovies = response?.movies || response || [];

        // STRICT FILTER: Sirf unhi movies ko lo jinki category me "recommended" string exist karta hai
        const onlyRecommended = allMovies.filter(
          (movie) => movie.category && movie.category.includes("recommended")
        );

        // State me sirf filter kiya hua data save karein
        setRecommendedMovies(onlyRecommended);
      } catch (err) {
        console.error("API Error: Fetching Recommended movies failed:", err);
        setError("Unable to load recommended content at this moment.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommended();
  }, []);

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
      
      {/* Header Segment */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-brand-orange font-bold text-sm mb-1 hover:underline flex items-center gap-1">
            ← Go Back
          </button>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight capitalize">
            Recommended For You
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Personalized content handpicked based on your viewing preferences.
          </p>
        </div>
        
        <div className="bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-orange-100 self-start sm:self-auto">
          Displaying {recommendedMovies.length} Matches
        </div>
      </div>

      {/* Grid Distribution Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {recommendedMovies.map((movie) => (
          <div
            key={movie._id}
            onClick={() => {
              if (isComingSoon(movie)) {
                alert("This content is coming soon! 🎬 Please check back shortly.");
                return;
              }
              navigate(`/watch/${movie.slug}`);
            }}
            className="relative bg-white border border-gray-100 rounded-2xl p-2.5 shadow-sm group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Premium Badge */}
              {movie.isPremium && (
                <span className="absolute top-4 left-4 z-10 bg-brand-orange text-[8px] text-white font-black tracking-widest px-2 py-0.5 rounded shadow-md uppercase">
                  Premium
                </span>
              )}
              {isComingSoon(movie) && (
                <span className="absolute top-4 right-4 z-20 bg-amber-500 text-[8px] text-white font-black tracking-widest px-2 py-0.5 rounded shadow-md uppercase">
                  Coming Soon
                </span>
              )}

              {/* Poster Image */}
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

              {/* Text Metadata */}
              <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors duration-200 px-0.5">
                {movie.title}
              </div>
              <div className="text-[11px] text-gray-400 font-bold mt-0.5 px-0.5 truncate">
                {movie.genre?.length > 0 ? movie.genre.join(" / ") : "Uncategorized"} {movie.releaseYear ? `• ${movie.releaseYear}` : ''}
              </div>
            </div>

            {/* Score Badge */}
            <div className="mt-3 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg text-[10px] font-black text-brand-orange w-max flex items-center gap-1">
              ⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}
            </div>
          </div>
        ))}

        {/* Empty State / Agar koi recommended movie nahi mili toh ye text dikhega */}
        {recommendedMovies.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-16 text-center text-sm font-semibold text-gray-400 shadow-sm">
            No recommended movies available at the moment. Please check back later.
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedPage;