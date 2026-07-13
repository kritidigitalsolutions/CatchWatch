import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay, FaHeart, FaRegHeart } from "react-icons/fa";
import { getShortFilms } from "../api/shortApi";
import { toggleBookmark, getBookmarks } from "../api/interactionApi";
import Loader from "../components/Loader";

const ShortFilmsPage = () => {
  const navigate = useNavigate();

  // States
  const [shortFilms, setShortFilms] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallback poster image
  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500&auto=format&fit=crop";

  const fetchShortFilmsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch short films
      const shortFilmsResponse = await getShortFilms({ limit: 100 });
      if (shortFilmsResponse && shortFilmsResponse.success) {
        setShortFilms(shortFilmsResponse.shortFilms || []);
      } else {
        setError("Failed to load short films from server.");
      }

      // 2. Fetch bookmarks/wishlist to map heart icons
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        try {
          const bookmarksResponse = await getBookmarks();
          if (bookmarksResponse && bookmarksResponse.success) {
            const bookmarkedList = bookmarksResponse.bookmarks || bookmarksResponse.data || [];
            const ids = new Set(bookmarkedList.map((item) => item._id || item.id));
            setBookmarkedIds(ids);
          }
        } catch (bookmarkErr) {
          console.error("Failed to load bookmarks:", bookmarkErr);
        }
      }
    } catch (err) {
      console.error("API error fetching short films:", err);
      setError("Unable to connect to CatchWatch API. Please ensure the backend server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShortFilmsData();
  }, []);

  const handleWishlistToggle = async (e, filmId) => {
    e.stopPropagation(); // Avoid triggering card click (play)
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to add items to your wishlist.");
      navigate("/login");
      return;
    }

    try {
      const res = await toggleBookmark(filmId);
      if (res && res.success) {
        setBookmarkedIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(filmId)) {
            newSet.delete(filmId);
          } else {
            newSet.add(filmId);
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error("Failed to toggle wishlist item:", err);
    }
  };

  // Split short films into "Short & Sweet" and "Trending Shorts"
  // Logic: Check if the film has category containing 'shortAndSweet' / 'trending'. 
  // Fallback: If no categories are tagged, partition the list (first 4 to Short & Sweet, rest to Trending)
  const taggedShortAndSweet = shortFilms.filter(
    (film) => film.category?.some((c) => c.toLowerCase() === "shortandsweet" || c.toLowerCase() === "short & sweet")
  );
  const taggedTrending = shortFilms.filter(
    (film) => film.category?.some((c) => c.toLowerCase() === "trending" || c.toLowerCase() === "trending shorts")
  );

  let shortAndSweetList = [];
  let trendingShortsList = [];

  if (taggedShortAndSweet.length > 0 || taggedTrending.length > 0) {
    shortAndSweetList = taggedShortAndSweet;
    trendingShortsList = taggedTrending;
    // Put anything untagged into trending fallback
    const taggedIds = new Set([...taggedShortAndSweet, ...taggedTrending].map((f) => f._id));
    const untagged = shortFilms.filter((film) => !taggedIds.has(film._id));
    trendingShortsList = [...trendingShortsList, ...untagged];
  } else {
    // Fallback split
    shortAndSweetList = shortFilms.slice(0, 4);
    trendingShortsList = shortFilms.slice(4);
  }

  if (isLoading) return <Loader />;

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
          onClick={fetchShortFilmsData}
          className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto w-full px-4 py-6">
      
      {/* 1. SHORT & SWEET SECTION */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black tracking-tight text-gray-900 border-l-4 border-brand-orange pl-3">
            Short & Sweet
          </h3>
          {/* <span className="text-xs font-bold text-brand-orange hover:underline cursor-pointer">
            More →
          </span> */}
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar snap-x">
          {shortAndSweetList.map((film) => {
            const isWishlisted = bookmarkedIds.has(film._id);
            return (
              <div
                key={film._id}
                onClick={() => navigate(`/watch/${film.slug}`)}
                className="w-44 sm:w-48 flex-shrink-0 relative group cursor-pointer snap-start flex flex-col justify-between"
              >
                <div>
                  <div className="w-full aspect-[3/4] bg-neutral-900 rounded-3xl overflow-hidden relative shadow-md">
                    <img
                      src={film.poster || FALLBACK_POSTER}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => handleWishlistToggle(e, film._id)}
                      className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur transition active:scale-90"
                    >
                      {isWishlisted ? (
                        <FaHeart className="text-red-500 text-sm" />
                      ) : (
                        <FaRegHeart className="text-white text-sm" />
                      )}
                    </button>

                    {/* Rating Badge */}
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black text-white flex items-center gap-1 shadow-sm">
                      ⭐ {film.rating ? film.rating.toFixed(1) : "0.0"}
                    </div>
                  </div>

                  <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors">
                    {film.title}
                  </div>
                  <div className="text-[11px] text-gray-400 font-bold mt-0.5">
                    {film.genre && film.genre.length > 0 ? film.genre[0] : "Short Film"}
                  </div>
                </div>
              </div>
            );
          })}

          {shortAndSweetList.length === 0 && (
            <div className="w-full bg-white border border-gray-100 rounded-3xl p-10 text-center text-sm font-semibold text-gray-400 shadow-sm">
              No short films in this section yet.
            </div>
          )}
        </div>
      </div>

      {/* 2. TRENDING SHORTS SECTION */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black tracking-tight text-gray-900 border-l-4 border-brand-orange pl-3">
            Trending Shorts
          </h3>
          {/* <span className="text-xs font-bold text-brand-orange hover:underline cursor-pointer">
            More →
          </span> */}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {trendingShortsList.map((film) => (
            <div
              key={film._id}
              onClick={() => navigate(`/watch/${film.slug}`)}
              className="relative group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-full aspect-[2/3] bg-neutral-900 rounded-3xl overflow-hidden relative shadow-md">
                  <img
                    src={film.thumbnailUrl || film.poster || film.banner }
                    alt={film.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Play Button Overlay (Similar to the user's screenshot layout) */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-white backdrop-blur-sm bg-black/10 transform scale-90 group-hover:scale-100 transition duration-300">
                      <FaPlay className="text-white text-base ml-1" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors px-1">
                  {film.title}
                </div>
                <div className="text-[11px] text-gray-400 font-bold mt-0.5 px-1">
                  {film.genre && film.genre.length > 0 ? film.genre.join(" / ") : "Trending"} • {film.releaseYear || ""}
                </div>
              </div>
            </div>
          ))}

          {trendingShortsList.length === 0 && (
            <div className="col-span-full bg-white border border-gray-150 rounded-3xl p-16 text-center text-sm font-semibold text-gray-400 shadow-sm">
              No trending shorts found.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ShortFilmsPage;
