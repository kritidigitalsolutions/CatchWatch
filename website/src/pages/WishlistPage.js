import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaHeart, FaPlay, FaTrashAlt } from "react-icons/fa";
import Loader from "../components/Loader";

const WishlistPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Mock Wishlist Data - Mapped to your Mongoose schema properties
  const [wishlistItems, setWishlistItems] = useState([
    {
      _id: "mv1",
      title: "The Past",
      slug: "the-past-1719600000000",
      genre: ["Horror", "Thriller"],
      releaseYear: 2018,
      poster:
        "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=500&auto=format&fit=crop",
      isPremium: true,
      rating: 9.0,
    },
    {
      _id: "mv5",
      title: "Dark Horizon",
      slug: "dark-horizon-1719600000004",
      genre: ["Sci-Fi", "Action"],
      releaseYear: 2025,
      poster:
        "https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=500&auto=format&fit=crop",
      isPremium: true,
      rating: 7.9,
    },
  ]);

  useEffect(() => {
    // BACKEND API INTEGRATION PLACEHOLDER:
    // Fetch user's wishlist from the database
    // fetch('/api/v1/user/wishlist', { headers: { Authorization: `Bearer ${token}` } })
    //   .then(res => res.json())
    //   .then(data => { setWishlistItems(data); setIsLoading(false); })
    //   .catch(err => { console.error(err); setIsLoading(false); });

    // Simulating API loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Function to handle removing an item from the wishlist
  const handleRemoveItem = (id, e) => {
    e.stopPropagation(); // Prevents the card click event from triggering when clicking the delete button

    // BACKEND API PLACEHOLDER:
    // fetch(`/api/v1/user/wishlist/${id}`, { method: 'DELETE' }).then(...)

    // Update UI optimistically
    const updatedList = wishlistItems.filter((item) => item._id !== id);
    setWishlistItems(updatedList);
  };

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 px-2 sm:px-0">
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
        {/* Header Metadata */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
          <h2 className="text-lg font-extrabold text-gray-900">
            Saved Content
          </h2>
          <span className="bg-brand-light-bg text-brand-orange text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-orange/10">
            {wishlistItems.length} Items Saved
          </span>
        </div>

        {/* Wishlist Grid */}
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {wishlistItems.map((movie) => (
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

                  {/* Poster Image */}
                  <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                    <img
                      src={movie?.poster}
                      alt={movie?.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                      loading="lazy"
                    />

                    {/* Hover Overlay: Play & Delete */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
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

                {/* Footer Row: Rating & Remove Button */}
                <div className="mt-3 flex items-center justify-between px-0.5">
                  <div className="bg-brand-light-bg/50 border border-brand-orange/5 px-2 py-1 rounded-lg text-[10px] font-black text-brand-orange w-max flex items-center gap-1">
                    ⭐ {movie?.rating?.toFixed(1) || "N/A"}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemoveItem(movie?._id, e)}
                    className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-full hover:bg-red-50"
                    title="Remove from wishlist"
                  >
                    <FaTrashAlt size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State UI */
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
