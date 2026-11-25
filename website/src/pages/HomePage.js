import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay, FaChevronLeft, FaChevronRight, FaBolt, FaMapMarkerAlt } from "react-icons/fa";
import { MdLiveTv } from "react-icons/md";
import Loader from '../components/Loader';
import { getMovies } from '../api/movieApi';
import { getAllContent } from '../api/contentApi';
import { getCategories } from '../api/categoryApi';
import { getActiveMatches } from '../api/liveMatchApi';

const HomePage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const isComingSoon = (movie) => {
    return movie?.isComingSoon === true || movie?.isComingSoon === "true";
  };

  // Dynamic States for API Data
  const [moviesList, setMoviesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback images
  const FALLBACK_POSTER = "https://img.magnific.com/premium-vector/abstract-orange-blur-gradient-background-design_624457-4943.jpg";
  const FALLBACK_CRICKET_BANNER = "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop";

  // Image URL Resolver Helper
  const getImageUrl = (url) => {
    if (!url || typeof url !== "string") return FALLBACK_POSTER;
    const cleanUrl = url.trim();
    if (!cleanUrl) return FALLBACK_POSTER;
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") || cleanUrl.startsWith("data:")) {
      return cleanUrl;
    }
    const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const baseUrl = apiBase.replace(/\/api\/?$/, "");
    return `${baseUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  const getCricketBannerUrl = (url) => {
    if (!url || typeof url !== "string" || !url.trim()) return FALLBACK_CRICKET_BANNER;
    return getImageUrl(url);
  };

  const getCricketLogoUrl = (url) => {
    if (!url || typeof url !== "string" || !url.trim()) return null;
    return getImageUrl(url);
  };

  // API Integration Effect
  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);

      try {
        // Fetch categories, content, and live matches in parallel
        const [contentRes, catRes, liveRes] = await Promise.all([
          getAllContent(),
          getCategories(),
          getActiveMatches({ limit: 6 }).catch(() => null),
        ]);

        if (liveRes && liveRes.matches && liveRes.matches.length > 0) {
          setLiveMatches(liveRes.matches);
        }

        if (contentRes && contentRes.content && contentRes.content.length > 0) {
          setMoviesList(contentRes.content);
        } else {
          const movieRes = await getMovies({ limit: 50 });
          setMoviesList(movieRes?.movies || movieRes || []);
        }

        if (catRes && catRes.categories && catRes.categories.length > 0) {
          const activeCats = catRes.categories.filter((c) => c.status === "Active");

          // Ensure Trending and Top 10 stay at top, new categories start below Top 10
          const trendingCat = activeCats.find(c => c.slug === "trending" || c.name.toLowerCase().includes("trending"));
          const top10Cat = activeCats.find(c => c.slug === "top10" || c.name.toLowerCase().includes("top 10"));
          const recommendedCat = activeCats.find(c => c.slug === "recommended" || c.name.toLowerCase().includes("recommended"));
          const otherCats = activeCats.filter(c =>
            c.slug !== "trending" &&
            c.slug !== "top10" &&
            c.slug !== "recommended" &&
            !c.name.toLowerCase().includes("trending") &&
            !c.name.toLowerCase().includes("top 10") &&
            !c.name.toLowerCase().includes("recommended")
          );

          const orderedCats = [];
          if (trendingCat) orderedCats.push(trendingCat);
          if (top10Cat) orderedCats.push(top10Cat);
          if (recommendedCat) orderedCats.push(recommendedCat);
          orderedCats.push(...otherCats);

          setCategoriesList(orderedCats);
        } else {
          // Default fallbacks if categories collection is empty
          setCategoriesList([
            { name: "Trending Now", slug: "trending", priority: 5 },
            { name: "Top 10 Global Hits", slug: "top10", priority: 4 },
            { name: "Recommended Content", slug: "recommended", priority: 3 },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch home content/categories:", error);
        try {
          const movieRes = await getMovies({ limit: 50 });
          setMoviesList(movieRes?.movies || movieRes || []);
        } catch (err) {
          setMoviesList([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // Real-Time Live Cricket Scores Auto-Polling (every 3 seconds)
  useEffect(() => {
    const liveScoreTimer = setInterval(async () => {
      try {
        const liveRes = await getActiveMatches({ limit: 6 }).catch(() => null);
        if (liveRes && liveRes.matches && liveRes.matches.length > 0) {
          setLiveMatches(liveRes.matches);
        }
      } catch (err) {
        // silent catch
      }
    }, 3000);

    return () => clearInterval(liveScoreTimer);
  }, []);

  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);

  // Sort content by Priority ascending (Priority 1 first, Priority 2 second...)
  const sortedMovies = [...moviesList].sort((a, b) => {
    const pA = a.priority && Number(a.priority) > 0 ? Number(a.priority) : Infinity;
    const pB = b.priority && Number(b.priority) > 0 ? Number(b.priority) : Infinity;
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Carousel Slides (Show only content where isNewContent is true)
  const newContentItems = sortedMovies.filter(item => item?.isNewContent === true || item?.isNewContent === "true");
  const itemsForCarousel = newContentItems.length > 0 ? newContentItems : sortedMovies;

  const carouselSlides = itemsForCarousel.map((movie) => ({
    id: movie._id,
    title: movie.title,
    tag: movie.isNewContent ? "New Release" : (movie.isPremium ? "Premium Release" : "Featured Stream"),
    subText: `${movie.genre?.join(" • ") || "Cinema"} • ${movie.releaseYear || "New"}`,
    image: getImageUrl(movie.banner || movie.poster || movie.thumbnailUrl || movie.thumbnail),
    slug: movie.slug,
    isComingSoon: movie.isComingSoon,
    videoSource: movie.videoSource,
    encodingStatus: movie.encodingStatus
  }));

  // Safeguard: Ensure currentSlide index never exceeds available slides
  useEffect(() => {
    if (carouselSlides.length > 0 && currentSlide >= carouselSlides.length) {
      setCurrentSlide(0);
    }
  }, [carouselSlides.length, currentSlide]);

  // Safe Automatic Slide Transition using Modulo (prevents out-of-bounds blank box)
  useEffect(() => {
    if (carouselSlides.length <= 1 || isHovered) return;
    const slideTimer = setInterval(() => {
      setIsTransitionEnabled(true);
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, [carouselSlides.length, isHovered]);

  const handleNextSlide = () => {
    setIsTransitionEnabled(true);
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const handlePrevSlide = () => {
    setIsTransitionEnabled(true);
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const activeDotIndex = currentSlide >= carouselSlides.length ? 0 : currentSlide;

  if (isLoading) return <Loader />;

  // Helper to filter movies by category slug or name (case-insensitive)
  const getCategoryItems = (catSlug, catName) => {
    const slugLower = (catSlug || "").toLowerCase().trim();
    const nameLower = (catName || "").toLowerCase().trim();

    const filtered = moviesList.filter((item) => {
      if (!item?.category) return false;
      const cats = Array.isArray(item.category) ? item.category : [item.category];
      return cats.some((c) => {
        if (!c) return false;
        const cLower = String(c).toLowerCase().trim();
        return cLower === slugLower || cLower === nameLower;
      });
    });

    // Sort by Priority ascending (Priority 1 on the left, then 2, 3, 4, 5...)
    return [...filtered].sort((a, b) => {
      const pA = a.priority && Number(a.priority) > 0 ? Number(a.priority) : 999;
      const pB = b.priority && Number(b.priority) > 0 ? Number(b.priority) : 999;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  };

  return (
    <div className="space-y-6 md:space-y-10 py-4">

      {/* Dynamic Carousel Banner Frame */}
      {carouselSlides.length > 0 && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-full rounded-xl md:rounded-2xl bg-neutral-900 aspect-[16/9] sm:aspect-[21/9] md:aspect-[25/10] overflow-hidden shadow-lg group"
        >
          <div
            className={`h-full w-full flex ${isTransitionEnabled ? "transition-transform duration-1000 ease-in-out" : ""}`}
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {carouselSlides.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                onClick={() => {
                  if (isComingSoon(slide)) {
                    alert("This content is coming soon! 🎬 Please check back shortly.");
                    return;
                  }
                  navigate(`/watch/${slide.slug}`);
                }}
                className="w-full h-full flex-shrink-0 relative flex flex-col justify-end items-center p-4 sm:p-8 text-center text-white cursor-pointer pb-6 sm:pb-10"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0" />
                <div className="relative z-10 max-w-xl space-y-1 sm:space-y-2 select-none pointer-events-none">
                  <span className="inline-block bg-brand-orange text-[9px] sm:text-xs font-black tracking-wider px-2.5 py-0.5 sm:py-1 rounded-full uppercase shadow">
                    {slide.tag}
                  </span>
                  <h2 className="text-base sm:text-2xl lg:text-3xl font-black tracking-tight drop-shadow-md">
                    {slide.title}
                  </h2>
                  <p className="text-orange-300 text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide drop-shadow">
                    {slide.subText}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows on Hover */}
          {carouselSlides.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevSlide();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/50 hover:bg-brand-orange text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                aria-label="Previous Slide"
              >
                <FaChevronLeft className="text-sm md:text-lg" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextSlide();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/50 hover:bg-brand-orange text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                aria-label="Next Slide"
              >
                <FaChevronRight className="text-sm md:text-lg" />
              </button>
            </>
          )}

          <div className="absolute bottom-2 md:bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-2.5">
            {carouselSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsTransitionEnabled(true);
                  setCurrentSlide(index);
                }}
                className={`md:h-2.5 h-1.5 rounded-full transition-all duration-300 ${activeDotIndex === index ? "md:w-7 w-4 bg-brand-orange" : "md:w-2.5 w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* LIVE CRICKET MATCHES STRIP - LIGHT THEME (MATCHES CATCHWATCH WEBSITE THEME) */}
      {liveMatches.length > 0 && (
        <div className="bg-white border border-orange-200/80 rounded-2xl p-3 sm:p-4 my-3 sm:my-5 shadow-sm relative overflow-hidden">
          {/* Subtle Ambient Background Warm Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-orange-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-red-400/5 rounded-full blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <div>
                <h3 className="text-sm sm:text-lg font-black text-gray-900 flex items-center gap-1.5 tracking-tight">
                  <MdLiveTv className="text-red-500 text-lg sm:text-xl" />
                  Live Cricket Matches
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                  Stream live cricket matches, real-time ball-by-ball scoreboards & tournament broadcasts
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/live-cricket")}
              className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-red-500 to-brand-orange hover:from-red-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-orange-500/20 flex items-center gap-1 hover:scale-[1.02]"
            >
              <span>Explore All</span>
              <span>→</span>
            </button>
          </div>

          {/* Matches Rail / Grid (Mobile: Horizontal swipe rail, Web: Compact 3-4 col grid) */}
          <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x sm:snap-none hide-scrollbar relative z-10">
            {liveMatches.slice(0, 10).map((match) => {
              const bannerSrc = getCricketBannerUrl(match.banner || match.streamThumbnailUrl);
              const team1Logo = getCricketLogoUrl(match.team1?.logo);
              const team2Logo = getCricketLogoUrl(match.team2?.logo);

              return (
                <div
                  key={match._id}
                  onClick={() => navigate(`/live-cricket/${match._id}`)}
                  className="w-[260px] sm:w-auto flex-shrink-0 sm:flex-shrink snap-start group bg-white border border-gray-200/90 hover:border-brand-orange/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md shadow-xs flex flex-col justify-between"
                >
                  {/* Top Match Banner Poster (Compact Height: h-24 sm:h-28) */}
                  <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-gray-100">
                    <img
                      src={bannerSrc}
                      alt={match.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_CRICKET_BANNER;
                      }}
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Top Chips */}
                    <div className="absolute top-1.5 inset-x-2 flex items-center justify-between gap-1">
                      <span className="backdrop-blur-md bg-black/65 border border-white/20 text-orange-300 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow">
                        {match.matchFormat} • {match.tournament}
                      </span>

                      {match.status === "LIVE" ? (
                        <span className="backdrop-blur-md bg-red-600 text-white px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-red-600/40 animate-pulse">
                          <span className="w-1 h-1 rounded-full bg-white" />
                          LIVE
                        </span>
                      ) : match.status === "UPCOMING" ? (
                        <span className="backdrop-blur-md bg-amber-500 text-white px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow">
                          UPCOMING
                        </span>
                      ) : (
                        <span className="backdrop-blur-md bg-gray-700 text-white px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider shadow">
                          COMPLETED
                        </span>
                      )}
                    </div>

                    {/* Center Hover Play Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-[1px]">
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 transform group-hover:scale-110 transition-transform">
                        <FaPlay className="ml-0.5 text-[10px]" />
                      </div>
                    </div>
                  </div>

                  {/* Card Content & Scoreboard (Light Theme) */}
                  <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      {/* Match Title */}
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-brand-orange transition-colors line-clamp-1 mb-1.5">
                        {match.title}
                      </h4>

                      {/* Head-to-Head Scoreboard Box (Compact) */}
                      <div className="bg-[#FFF8F3] border border-orange-200/80 rounded-lg p-1.5 sm:p-2 mb-1.5 space-y-1 shadow-xs">
                        {/* Team 1 */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            {team1Logo ? (
                              <img
                                src={team1Logo}
                                alt={match.team1?.name}
                                className="w-4 h-4 rounded-full object-cover bg-white ring-1 ring-orange-200 shadow-xs flex-shrink-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-[8px] font-black shadow-xs flex-shrink-0">
                                {match.team1?.shortName?.charAt(0) || match.team1?.name?.charAt(0) || "T"}
                              </div>
                            )}
                            <span className="font-bold text-gray-900 truncate text-[11px] sm:text-xs">
                              {match.team1?.name}
                            </span>
                            {match.team1?.shortName && (
                              <span className="text-[8px] font-semibold text-gray-400 uppercase hidden sm:inline">
                                ({match.team1.shortName})
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-extrabold text-orange-600 text-[11px] sm:text-xs flex-shrink-0">
                            {match.team1?.score || "—"}
                          </span>
                        </div>

                        <div className="border-t border-orange-200/60" />

                        {/* Team 2 */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            {team2Logo ? (
                              <img
                                src={team2Logo}
                                alt={match.team2?.name}
                                className="w-4 h-4 rounded-full object-cover bg-white ring-1 ring-gray-200 shadow-xs flex-shrink-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-[8px] font-black shadow-xs flex-shrink-0">
                                {match.team2?.shortName?.charAt(0) || match.team2?.name?.charAt(0) || "T"}
                              </div>
                            )}
                            <span className="font-bold text-gray-900 truncate text-[11px] sm:text-xs">
                              {match.team2?.name}
                            </span>
                            {match.team2?.shortName && (
                              <span className="text-[8px] font-semibold text-gray-400 uppercase hidden sm:inline">
                                ({match.team2.shortName})
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-gray-700 text-[11px] sm:text-xs flex-shrink-0">
                            {match.team2?.score || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Current Commentary Snippet */}
                      {match.currentStatusText && (
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-amber-900 font-medium bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded mb-1.5">
                          <FaBolt className="text-amber-600 text-[8px] flex-shrink-0" />
                          <span className="truncate">{match.currentStatusText}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Venue & Watch Action */}
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 text-[9px] sm:text-[10px] text-gray-500">
                      <span className="flex items-center gap-1 truncate max-w-[60%]">
                        <FaMapMarkerAlt className="text-gray-400 text-[8px] flex-shrink-0" />
                        <span className="truncate">{match.venue || "Live Stadium"}</span>
                      </span>

                      <span className="text-brand-orange font-bold flex items-center gap-0.5 group-hover:text-orange-700 text-[9px] sm:text-[10px] flex-shrink-0">
                        <FaPlay className="text-[7px]" /> Watch
                      </span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DYNAMIC CATEGORY SECTIONS */}
      {categoriesList.map((category) => {
        const categoryItems = getCategoryItems(category.slug, category.name);
        if (categoryItems.length === 0) return null;

        // Top 10 special leaderboard layout
        if (category.slug === "top10" || category.name.toLowerCase().includes("top 10")) {
          const sortedTopTen = [...categoryItems]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 10);

          return (
            <div key={category._id || category.slug}>
              <div className="flex justify-between items-center mb-4 sm:mb-5">
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                  {category.name || "Top 10 Global Hits"}
                </h3>
                <button
                  onClick={() => navigate("/charts")}
                  className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition"
                >
                  View Charts →
                </button>
              </div>

              <div className="flex gap-5 sm:gap-6 overflow-x-auto pb-4 pt-2 px-1 overflow-y-hidden hide-scrollbar snap-x">
                {sortedTopTen.map((movie, index) => (
                  <div
                    key={movie._id}
                    onClick={() => {
                      if (isComingSoon(movie)) {
                        alert("This content is coming soon! 🎬 Please check back shortly.");
                        return;
                      }
                      navigate(`/watch/${movie.slug}`);
                    }}
                    className="flex-shrink-0 w-[200px] sm:w-[250px] relative snap-start group cursor-pointer pl-6 sm:pl-10"
                  >
                    <span className="absolute left-[-10px] bottom-[-16px] text-7xl sm:text-9xl font-black tracking-tighter text-gray-200 select-none z-0 transition-colors group-hover:text-brand-orange/10 duration-300">
                      {index + 1}
                    </span>
                    <div className="relative z-10  bg-neutral-900 rounded-2xl overflow-hidden shadow-md aspect-[2/3] border border-white/10">
                      {isComingSoon(movie) && (
                        <span className="absolute top-2 right-2 z-20 bg-amber-500 text-[8px] text-white font-black tracking-widest px-1.5 py-0.5 rounded uppercase">
                          Soon
                        </span>
                      )}
                      <img
                        src={movie.poster || movie.banner || movie.thumbnailUrl || movie.thumbnail || FALLBACK_POSTER}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-3 flex flex-col justify-end">
                        <h4 className="text-white font-bold text-xs sm:text-sm truncate drop-shadow">
                          {movie.title}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-brand-orange font-bold">
                            ⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}
                          </span>
                          {movie.isPremium && (
                            <span className="bg-brand-orange text-[7px] text-white font-black px-1 rounded">
                              PRO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Standard Category Content Grid Row
        return (
          <div key={category._id || category.slug}>
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                {category.name}
              </h3>
              <button
                onClick={() => navigate(`/explore?context=${category.slug}`)}
                className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition"
              >
                More Content →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
              {categoryItems.map((movie) => (
                <div
                  key={movie._id}
                  onClick={() => {
                    if (isComingSoon(movie)) {
                      alert("This content is coming soon! 🎬 Please check back shortly.");
                      return;
                    }
                    navigate(`/watch/${movie.slug}`);
                  }}
                  className="relative bg-white border border-gray-100 rounded-2xl p-2 sm:p-2.5 shadow-sm group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {movie.isPremium && (
                      <span className="absolute top-3.5 left-3.5 z-20 bg-brand-orange text-[8px] sm:text-[9px] text-white font-black tracking-widest px-2 py-0.5 rounded-md shadow-md uppercase">
                        PRO
                      </span>
                    )}
                    {isComingSoon(movie) && (
                      <span className="absolute top-3.5 right-3.5 z-20 bg-amber-500 text-[8px] sm:text-[9px] text-white font-black tracking-widest px-2 py-0.5 rounded-md shadow-md uppercase">
                        Soon
                      </span>
                    )}
                    <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                      <img
                        src={movie.poster || movie.banner || movie.thumbnailUrl || movie.thumbnail || FALLBACK_POSTER}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center text-base font-bold shadow-lg shadow-brand-orange/40 scale-75 group-hover:scale-100 transform transition-transform duration-300">
                          <FaPlay />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="font-extrabold text-xs sm:text-sm text-gray-800 truncate px-0.5 group-hover:text-brand-orange transition-colors">
                        {movie.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate mt-0.5 px-0.5">
                        {movie.genre?.join(" • ") || "Cinema"}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center justify-between mt-2 pt-1.5 border-t border-gray-50 px-0.5">
                    <span className="text-brand-orange font-bold">
                      ⭐ {movie.rating ? movie.rating.toFixed(1) : "0.0"}
                    </span>
                    <span className="text-[10px] text-gray-400">HD Stream</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

    </div>
  );
};

export default HomePage;