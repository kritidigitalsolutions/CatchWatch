import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay } from "react-icons/fa";
import Loader from '../components/Loader';
// Agar aapke paas getMovies API hai toh isko uncomment kar lein:
import { getMovies } from '../api/movieApi';

const HomePage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Dynamic States for API Data
  const [moviesList, setMoviesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback images
  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop";
  const FALLBACK_BANNER = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop";

  // API Integration Effect
  // API Integration Effect
  useEffect(() => {
    const fetchHomeMovies = async () => {
      setIsLoading(true); // Loading ko true rakhein jab tak data na aa jaye
      
      try {
        // REAL API CALL: getMovies function ko directly call karein
        const response = await getMovies({ limit: 50 }); 
        
        // Backend se jo response aa raha hai, usme se 'movies' array nikal lein
        // Pichle json response ke according api { success: true, movies: [...] } bhejti hai
        if (response && response.movies) {
          setMoviesList(response.movies);
        } else {
          setMoviesList(response || []); // Fallback agar direct array aaye
        }
        
      } catch (error) {
        console.error("Failed to fetch movies:", error);
        setMoviesList([]); // Error aane par empty array set karein taaki app crash na ho
      } finally {
        setIsLoading(false); // Data aaye ya error, loading spinner ko band kar dein
      }
    };

    fetchHomeMovies();
  }, []);

      // -------------------------------------------------------------
      // DYNAMIC DATA CATEGORIZATION (Filtering based on JSON 'category' array)
      // -------------------------------------------------------------

      // 1. Trending Movies
      const trendingMovies = moviesList.filter(movie => movie?.category?.includes("trending"));

      // 2. Top 10 Movies (Filtered by category, sorted by rating)
      const topTenMovies = moviesList
        .filter(movie => movie?.category?.includes("top10"))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10);

      // 3. Recommended Movies (Movies that are NOT in top10 or trending, or just fallback to all)
      const recommendedMovies = moviesList.filter(
        movie => !movie?.category?.includes("trending") && !movie?.category?.includes("top10")
      );
      // Fallback agar API se categories proper set na hon:
      const displayRecommended = recommendedMovies.length > 0 ? recommendedMovies : moviesList.slice(0, 12);

      // 4. Carousel Slides (Take top 3 premium or highly rated movies)
      const carouselSlides = moviesList.slice(0, 3).map((movie, index) => ({
        id: movie._id,
        title: movie.title,
        tag: movie.isPremium ? "Premium Release" : "Featured Stream",
        subText: `${movie.genre?.join(" • ") || "Cinema"} • ${movie.releaseYear || "New"}`,
        image: movie.banner || movie.poster || FALLBACK_BANNER,
        slug: movie.slug
      }));

      // Automatic slide transition
      useEffect(() => {
        if (carouselSlides.length === 0) return;
        const slideTimer = setInterval(() => {
          setCurrentSlide((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(slideTimer);
      }, [carouselSlides.length]);

      if (isLoading) return <Loader />;

      return (
        <div className="space-y-6 md:space-y-10 py-4">

          {/* Dynamic Carousel Banner Frame */}
          {carouselSlides.length > 0 && (
            <div className="relative w-full rounded-2xl bg-neutral-900 aspect-[16/9] md:aspect-[21/9] overflow-hidden shadow-lg group">
              <div
                className="h-full w-full flex transition-transform duration-1000 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselSlides.map((slide) => (
                  <div
                    key={slide.id}
                    onClick={() => navigate(`/watch/${slide.slug}`)}
                    className="w-full h-full flex-shrink-0 relative flex flex-col justify-center items-center p-6 text-center text-white cursor-pointer"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${slide.image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/40 z-0" />
                    <div className="relative z-10 max-w-xl space-y-2 select-none pointer-events-none">
                      <span className="inline-block bg-brand-orange text-[10px] md:text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase shadow">
                        {slide.tag}
                      </span>
                      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-md">
                        {slide.title}
                      </h2>
                      <p className="text-brand-orange text-[10px] sm:text-xs md:text-sm font-bold tracking-wider drop-shadow">
                        {slide.subText}
                      </p>
                      
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-2.5">
                {carouselSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${currentSlide === index ? "w-7 bg-brand-orange" : "w-2.5 bg-white/40 hover:bg-white/70"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 1. Trending Now Section */}
          {trendingMovies.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                  Trending Now
                </h3>
                <button onClick={() => navigate("/explore?context=trending")} className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition">
                  More Content →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {trendingMovies.map((movie) => (
                  <div
                    key={movie._id}
                    onClick={() => navigate(`/watch/${movie.slug}`)}
                    className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {movie.isPremium && (
                      <span className="absolute top-3 left-3 z-20 bg-brand-orange text-[9px] text-white font-black tracking-widest px-2.5 py-0.5 rounded-lg shadow-md uppercase">Premium</span>
                    )}
                    <div className="w-full aspect-[2/3] bg-neutral-900 relative overflow-hidden">
                      <img
                        src={movie.poster || FALLBACK_POSTER}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-85"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg shadow-brand-orange/40 scale-75 group-hover:scale-100 transform transition-transform duration-300">
                          <FaPlay />
                        </div>
                      </div>
                    </div>
                    <div className="p-3.5 bg-white flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors">{movie.title}</h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">{movie.genre?.join(" • ") || "Action • Cinema"}</p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-gray-50 pt-2 text-[11px] font-bold text-gray-500">
                        <span className="bg-brand-light-bg text-brand-orange px-2 py-0.5 rounded-md">⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}</span>
                        <span>HD Stream</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Top 10 Global Leaderboard Row */}
          {topTenMovies.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                  Top 10 Global Hits
                </h3>
                <button onClick={() => navigate("/charts")} className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition">
                  View Charts →
                </button>
              </div>

              <div className="flex gap-6 overflow-x-auto pb-4 pt-2 px-1 overflow-y-hidden hide-scrollbar snap-x">
                {topTenMovies.map((movie, index) => (
                  <div
                    key={movie._id}
                    onClick={() => navigate(`/watch/${movie.slug}`)}
                    className="flex-shrink-0 w-[140px] sm:w-[160px] relative snap-start group cursor-pointer pl-8 sm:pl-12"
                  >
                    <span className="absolute left-[-10px] bottom-[-16px] text-7xl sm:text-9xl font-black tracking-tighter text-gray-200 select-none z-0 transition-colors group-hover:text-brand-orange/10 duration-300">
                      {index + 1}
                    </span>
                    <div className="relative z-10 bg-neutral-900 rounded-2xl overflow-hidden shadow-md aspect-[2/3] border border-white/10">
                      <img
                        src={movie.poster || FALLBACK_POSTER}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-3 flex flex-col justify-end">
                        <h4 className="text-white font-bold text-xs sm:text-sm truncate drop-shadow">{movie.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-brand-orange font-bold">⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}</span>
                          {movie.isPremium && <span className="bg-brand-orange text-[7px] text-white font-black px-1 rounded">PRO</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Recommended Content Grid Layout Block */}
          {displayRecommended.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                  Recommended Content
                </h3>
                <button onClick={() => navigate("/recommended")} className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition">
                  See All →
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {displayRecommended.map((movie) => (
                  <div
                    key={movie._id}
                    onClick={() => navigate(`/watch/${movie.slug}`)}
                    className="relative bg-white border border-gray-100 rounded-2xl p-2 shadow-sm group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {movie.isPremium && (
                        <span className="absolute top-3 left-3 z-10 bg-brand-orange text-[7px] text-white font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">PRO</span>
                      )}
                      <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                        <img
                          src={movie.poster || FALLBACK_POSTER}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-brand-orange text-lg">
                          <span className="text-white text-2xl"><FaPlay /></span>
                        </div>
                      </div>
                      <div className="mt-2.5 font-bold text-xs sm:text-sm text-gray-800 truncate px-0.5 group-hover:text-brand-orange transition-colors">
                        {movie.title}
                      </div>
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center gap-1 mt-1.5 px-0.5">
                      <span className="text-brand-orange">⭐</span> {movie.rating ? movie.rating.toFixed(1) : "0.0"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      );
    };

    export default HomePage;