import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay } from "react-icons/fa";
import { getMovies } from "../api/movieApi";

const MoviesPage = () => {
  const navigate = useNavigate();

  // Filter & Sort States
  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500&auto=format&fit=crop";
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [sortOrder, setSortOrder] = useState("trending");

  // Dynamic API Fetch States
  const [moviesList, setMoviesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMoviesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMovies({ limit: 100 });
      if (response && response.success) {
        setMoviesList(response.movies || []);
      } else {
        setError("Failed to fetch movies from the server.");
      }
    } catch (err) {
      console.error("Database query failed:", err);
      setError("Unable to connect to CatchWatch API. Please ensure the backend server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMoviesData();
  }, []);

  // 1. FILTERING
  const filteredMovies = (moviesList || []).filter(
    (movie) => selectedGenre === "All" || movie?.genre?.includes(selectedGenre)
  );

  // 2. SORTING
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    if (sortOrder === "rating") {
      return (b?.rating || 0) - (a?.rating || 0);
    }
    if (sortOrder === "newest") {
      return (b?.releaseYear || 0) - (a?.releaseYear || 0);
    }
    // Default/Trending: priority (descending), then releaseYear (descending)
    const priorityA = a?.priority || 0;
    const priorityB = b?.priority || 0;
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    return (b?.releaseYear || 0) - (a?.releaseYear || 0);
  });

  const featuredMovie = moviesList?.[0];

  if (isLoading) {
    return (
      <div className="space-y-10 max-w-7xl mx-auto w-full px-1 animate-pulse">
        {/* Cinematic Spotlight Banner Loading Skeleton */}
        <div className="relative w-full rounded-3xl bg-neutral-900/10 aspect-[16/8] md:aspect-[21/8] overflow-hidden shadow-sm border border-neutral-200/50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Filter Panel Skeleton */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
          <div className="flex gap-4 p-2 overflow-x-auto w-full md:w-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-20 bg-gray-200 rounded-xl flex-shrink-0" />
            ))}
          </div>
          <div className="h-10 w-48 bg-gray-200 rounded-xl self-start md:self-auto animate-pulse" />
        </div>

        {/* Dynamic Grid Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="bg-white border border-gray-150 rounded-2xl p-2.5 space-y-3">
                <div className="w-full aspect-[2/3] bg-gray-200 bg-gradient-to-br from-gray-200 to-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 py-20 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl shadow-sm">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900">Connection Failed</h2>
          <p className="text-sm text-gray-500 max-w-md">{error}</p>
        </div>
        <button
          onClick={fetchMoviesData}
          className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow-md transform active:scale-95 hover:shadow-orange-500/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto w-full px-1">
      {/* 1. CINEMATIC FEATURE SPOTLIGHT WINDOW PANEL */}
      {featuredMovie && (
        <div className="relative w-full rounded-3xl bg-neutral-950 aspect-[16/8] md:aspect-[21/8] overflow-hidden shadow-xl border border-neutral-900 group">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000 ease-out"
            style={{ backgroundImage: `url(${featuredMovie?.banner})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent z-10" />

          <div className="absolute inset-0 z-20 p-6 sm:p-10 md:p-14 flex flex-col justify-center max-w-xl text-white space-y-3 select-none">
            <span className="bg-brand-orange text-[9px] sm:text-[10px] font-black tracking-widest px-3 py-1 rounded-xl w-max uppercase shadow-md shadow-brand-orange/10">
              Featured Blockbuster
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-1 tracking-tight drop-shadow-md group-hover:text-brand-orange transition-colors duration-300">
              {featuredMovie?.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 font-bold">
              <span>{featuredMovie?.releaseYear}</span>
              <span>•</span>
              <span>{featuredMovie?.duration}</span>
              <span>•</span>
              <span className="text-brand-orange">
                {featuredMovie?.genre?.join(" / ")}
              </span>
            </div>
            <p className="text-xs text-neutral-300 hidden sm:line-clamp-3 leading-relaxed font-medium">
              {featuredMovie?.description}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate(`/watch/${featuredMovie?.slug}`)}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow transform active:scale-95 flex items-center justify-center"
              >
                <span className="flex items-center gap-2">
                  <FaPlay /> Play Content
                </span>
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-3 rounded-xl backdrop-blur transition transform active:scale-95">
                Add to Wishlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADVANCED CONTROL CONSOLE FILTER PANEL */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="flex gap-4 p-2 overflow-x-auto overflow-y-hidden hide-scrollbar snap-x">
          {["All", "Action", "Drama", "Horror", "Thriller", "Sci-Fi"].map(
            (genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide snap-start whitespace-nowrap transition-all duration-200 ${
                  selectedGenre === genre
                    ? "bg-orange-100 text-orange-600 shadow-md scale-105"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {genre}
              </button>
            )
          )}
        </div>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-black text-gray-600 focus:outline-none focus:border-brand-orange cursor-pointer self-start md:self-auto shadow-inner"
        >
          <option value="trending">Sorting Track: Trending Hits</option>
          <option value="rating">
            Sorting Track: Critic Score (High - Low)
          </option>
          <option value="newest">
            Sorting Track: New Releases ({new Date().getFullYear()})
          </option>
        </select>
      </div>

      {/* 3. DYNAMIC CONTENT POSTER MATRIX GRID */}
      <div className="space-y-4">
        <h3 className="text-xl font-black tracking-tight text-gray-900 border-l-4 border-brand-orange pl-3">
          Cinema Movies Collection
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {sortedMovies.map((movie) => (
            <div
              key={movie?._id}
              onClick={() => navigate(`/watch/${movie?.slug}`)}
              className="relative bg-white border border-gray-100 rounded-2xl p-2.5 shadow-sm group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {movie?.isPremium && (
                  <span className="absolute top-4 left-4 z-10 bg-brand-orange text-[8px] text-white font-black tracking-widest px-2 py-0.5 rounded shadow-md uppercase">
                    Premium
                  </span>
                )}

                <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                  <img
                    src={movie?.poster && movie.poster.trim() !== "" ? movie.poster : FALLBACK_POSTER}
                    alt={movie?.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-11 h-11 bg-brand-orange text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <FaPlay />
                    </div>
                  </div>
                </div>

                <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors duration-200 px-0.5">
                  {movie?.title}
                </div>
                <div className="text-[11px] text-gray-400 font-bold mt-0.5 px-0.5 truncate">
                  {movie?.genre?.join(" / ")} • {movie?.releaseYear}
                </div>
              </div>

              <div className="mt-3 bg-brand-light-bg/50 border border-brand-orange/5 px-2 py-1 rounded-lg text-[10px] font-black text-brand-orange w-max flex items-center gap-1">
                ⭐ {movie?.rating?.toFixed(1) || "0.0"}
              </div>
            </div>
          ))}

          {sortedMovies.length === 0 && (
            <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-16 text-center text-sm font-semibold text-gray-400 shadow-sm">
              No movie productions matching the current context sequence values exist in the database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoviesPage;