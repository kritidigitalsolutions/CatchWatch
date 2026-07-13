import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaHeart, FaPlay, FaTrashAlt } from "react-icons/fa";
import Loader from "../components/Loader";

// Apni sahi API file ka path yahan dalen
import { getBookmarks, toggleBookmark } from "../api/interactionApi";

const WishlistPage = () => {
  const navigate = useNavigate();

  const isComingSoon = (movie) => {
    return movie?.isComingSoon === true || movie?.isComingSoon === "true";
  };
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_POSTER =
    "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500&auto=format&fit=crop";

  useEffect(() => {
    const fetchWishlist = async () => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");

      if (!token) {
        setError("You need to be logged in to view your wishlist.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await getBookmarks();

        // Backend se aane wale data structure ko handle karna
        const items = response?.bookmarks || response?.data || response || [];

        // Backend se populate data nikalna
        const formattedItems = items.map((item) => {
          if (item.contentDetails) {
            return { ...item.contentDetails, bookmarkRefId: item._id, contentType: item.contentType };
          } else if (item.contentId && typeof item.contentId === 'object') {
            return { ...item.contentId, bookmarkRefId: item._id, contentType: item.contentType };
          }
          return item;
        });

        // Filter out nulls in case some referenced content was deleted from DB
        setWishlistItems(
          formattedItems.filter((item) => item && (item._id || item.id)),
        );
      } catch (err) {
        console.error("Error fetching wishlist:", err);
        if (err.response && err.response.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load your wishlist. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  // Function to handle removing an item from the wishlist
  const handleRemoveItem = async (id, e) => {
    e.stopPropagation(); // Prevents navigating to the video page

    // Optimistic UI Update: Turant list se hata dein
    const previousItems = [...wishlistItems];
    setWishlistItems((prev) =>
      prev.filter((item) => item._id !== id && item.id !== id),
    );

    try {
      await toggleBookmark(id);
    } catch (error) {
      console.error(`Failed to remove item ${id}:`, error);
      alert("Failed to remove item. Please try again.");
      // Rollback if API fails
      setWishlistItems(previousItems);
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 px-2 sm:px-0 py-6">
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button
          onClick={() => navigate(-1)}
          className="text-xl hover:scale-110 transition"
        >
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
          <FaHeart /> Personal Wish List
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 min-h-[60vh]">
        {/* Error State */}
        {error && (
          <div className="text-center py-10 flex flex-col items-center">
            <p className="text-red-500 font-bold mb-4">{error}</p>
            {(error.includes("logged in") || error.includes("Session")) && (
              <button
                onClick={() => navigate("/login")}
                className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold"
              >
                Log In Securely
              </button>
            )}
          </div>
        )}

        {/* Header Metadata */}
        {!error && (
          <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
            <h2 className="text-lg font-extrabold text-gray-900">
              Saved Content
            </h2>
            <span className="bg-brand-light-bg text-brand-orange text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-orange/10">
              {wishlistItems.length} Items Saved
            </span>
          </div>
        )}

        {/* Wishlist Grid */}
        {!error && wishlistItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {wishlistItems.map((movie) => {
              const contentId = movie?._id || movie?.id;
              const playIdentifier = movie?.slug || contentId;
              const genreText = Array.isArray(movie?.genre)
                ? movie.genre.join(" / ")
                : movie?.genre || "Content";

                return (
                  <div
                    key={contentId}
                    onClick={() => {
                      if (isComingSoon(movie)) {
                        alert("This content is coming soon! 🎬 Please check back shortly.");
                        return;
                      }
                      if (movie.contentType === "reel") {
                        navigate(`/reels/${contentId}`);
                      } else {
                        navigate(`/watch/${playIdentifier}`);
                      }
                    }}
                    className="relative bg-white border border-gray-100 rounded-2xl p-2.5 shadow-sm group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                  <div>
                    {movie?.isPremium && (
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
                      {/* <img
                        src={movie?.poster || movie?.thumbnail || FALLBACK_POSTER}
                        alt={movie?.title || "Content"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                        loading="lazy"
                      /> */}
                      <img
                        src={
                          movie?.poster && movie.poster.trim() !== ""
                            ? movie.poster
                            : movie?.thumbnail && movie.thumbnail.trim() !== ""
                              ? movie.thumbnail
                              : FALLBACK_POSTER
                        }
                        alt={movie?.title || "Content"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                        loading="lazy"
                      />

                      {/* Hover Overlay: Play Icon */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                          <FaPlay />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors duration-200 px-0.5">
                      {movie?.title || "Untitled"}
                    </div>
                    <div className="text-[11px] text-gray-400 font-bold mt-0.5 px-0.5 truncate">
                      {genreText}{" "}
                      {movie?.releaseYear && `• ${movie.releaseYear}`}
                    </div>
                  </div>

                  {/* Footer Row: Rating & Remove Button */}
                  <div className="mt-3 flex items-center justify-between px-0.5">
                    <div className="bg-brand-light-bg/50 border border-brand-orange/5 px-2 py-1 rounded-lg text-[10px] font-black text-brand-orange w-max flex items-center gap-1">
                      ⭐ {movie?.rating?.toFixed(1) || "N/A"}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleRemoveItem(contentId, e)}
                      className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-full hover:bg-red-50"
                      title="Remove from wishlist"
                    >
                      <FaTrashAlt size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State UI */}
        {!error && wishlistItems.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4">
            <div className="w-20 h-20 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-3xl shadow-sm border border-brand-orange/10 mb-5">
              <FaHeart />
            </div>
            <h2 className="text-xl font-black tracking-tight text-gray-900 mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-sm text-gray-500 font-medium max-w-sm mb-6 leading-relaxed">
              Looks like you haven't saved any movies or shows yet. Discover
              trending content and add them here to watch later!
            </p>
            <button
              onClick={() => navigate("/movies")}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md transform active:scale-95"
            >
              Explore Content
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
