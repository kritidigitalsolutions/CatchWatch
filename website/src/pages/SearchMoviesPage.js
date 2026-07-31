import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoSearch } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import VerifiedBadge from "../components/VerifiedBadge";
import { searchContent, getAllContent } from "../api/contentApi";
import { searchUsers } from "../api/userApi";

const SearchMoviesPage = () => {
  const navigate = useNavigate();

  const isComingSoon = (item) => {
    return item?.isComingSoon === true || item?.isComingSoon === "true";
  };

  const [queryState, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [searchTab, setSearchTab] = useState("content"); // 'content' | 'users'
  const [searchResults, setSearchResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200&auto=format&fit=crop";

  // Debounce (Wait 400ms after user stops typing to hit API)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(queryState);
    }, 400);
    return () => clearTimeout(handler);
  }, [queryState]);

  // Fetch Data from Backend
  useEffect(() => {
    const fetchData = async () => {
      const query = debouncedQuery.trim();

      setIsLoading(true);
      setError(null);

      try {
        if (searchTab === "users") {
          if (query.length > 0) {
            const uRes = await searchUsers(query);
            setUserResults(uRes.users || []);
          } else {
            setUserResults([]);
          }
        } else {
          let response;
          if (query.length > 0) {
            response = await searchContent({ query });
          } else {
            response = await getAllContent();
          }

          const fetchedData = response?.results || response?.content || response?.data || response || [];
          setSearchResults(Array.isArray(fetchedData) ? fetchedData : []);
        }
      } catch (err) {
        console.error("Search API Error:", err);
        setError("Failed to fetch search results. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedQuery, searchTab]);

  // Navigation Click Handler
  const handleItemClick = (item) => {
    if (isComingSoon(item)) {
      alert("This content is coming soon! 🎬 Please check back shortly.");
      return;
    }
    const type = typeof item.type === "string" ? item.type : "movie";
    const identifier = item.slug || item._id;

    if (!identifier) return;

    if (type.toLowerCase() === "series" || type.toLowerCase() === "tv") {
      navigate(`/tv-shows-episodes/${identifier}`);
    } else if (type.toLowerCase() === "short") {
      navigate("/shorts");
    } else {
      navigate(`/watch/${identifier}`);
    }
  };

  const formatCategory = (categoryData) => {
    if (Array.isArray(categoryData)) return categoryData[0] || "Content";
    if (typeof categoryData === "string") return categoryData;
    return "Content";
  };

  const getValidImageSource = (item) => {
    if (!item) return FALLBACK_IMAGE;
    if (item.poster && typeof item.poster === "string" && item.poster.trim() !== "") return item.poster.trim();
    if (item.banner && typeof item.banner === "string" && item.banner.trim() !== "") return item.banner.trim();
    if (item.thumbnailUrl && typeof item.thumbnailUrl === "string" && item.thumbnailUrl.trim() !== "") return item.thumbnailUrl.trim();
    if (item.thumbnail && typeof item.thumbnail === "string" && item.thumbnail.trim() !== "") return item.thumbnail.trim();
    if (item.image && typeof item.image === "string" && item.image.trim() !== "") return item.image.trim();
    return FALLBACK_IMAGE;
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 py-6 px-4 sm:px-0">
      {/* Search Input */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center gap-4 group focus-within:border-brand-orange transition-all">
        <span className="text-xl text-gray-400 group-focus-within:text-brand-orange transition-colors">
          <IoSearch />
        </span>
        <input
          type="text"
          placeholder="Search for Movies, TV Shows, Creators & Users..."
          value={queryState}
          onChange={(e) => setQueryState(e.target.value)}
          className="w-full border-none text-base outline-none text-gray-800 font-bold placeholder-gray-400 bg-transparent"
        />
        {queryState && (
          <button
            onClick={() => setQueryState("")}
            className="text-gray-400 hover:text-brand-orange bg-gray-100 hover:bg-orange-50 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs Header */}
      <div className="flex gap-3 border-b border-gray-200 pb-2">
        <button
          onClick={() => setSearchTab("content")}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-sm transition ${
            searchTab === "content"
              ? "bg-brand-orange text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🎬 Movies & TV Shows
        </button>
        <button
          onClick={() => setSearchTab("users")}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-sm transition flex items-center gap-2 ${
            searchTab === "users"
              ? "bg-brand-orange text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <FaUser /> Creators & Users
        </button>
      </div>

      {/* Content / Users Display */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 min-h-[50vh]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
            {searchTab === "users"
              ? `User Matches (${userResults.length})`
              : debouncedQuery.length > 0
              ? `Search Matches (${searchResults.length})`
              : "Recommended for You"}
          </h3>
          {isLoading && <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-orange rounded-full animate-spin"></div>}
        </div>

        {error && (
          <div className="text-center py-6 px-4 text-sm text-red-600 font-bold bg-red-50 rounded-xl">
            {error}
          </div>
        )}

        {!isLoading && !error && searchTab === "users" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userResults.map((u) => (
              <div
                key={u._id}
                onClick={() => navigate(`/user/${u.username ? u.username.replace(/^@/, "") : u._id}`)}
                className="flex items-center justify-between bg-gray-50/50 hover:bg-orange-50/50 p-4 rounded-xl border border-gray-100 hover:border-brand-orange/30 group cursor-pointer transition-all duration-300 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-brand-orange text-white text-lg font-black flex items-center justify-center overflow-hidden flex-shrink-0">
                    {u.profileImage ? (
                      <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.name ? u.name.charAt(0).toUpperCase() : "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-extrabold text-gray-800 group-hover:text-brand-orange transition-colors flex items-center gap-1.5">
                      <span className="truncate">{u.name}</span>
                      <VerifiedBadge user={u} size="sm" />
                    </div>
                    <div className="text-xs text-brand-orange font-bold">
                      {u.username ? (u.username.startsWith("@") ? u.username : `@${u.username}`) : "@user"}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-brand-orange pl-2">View ➔</span>
              </div>
            ))}

            {userResults.length === 0 && (
              <div className="col-span-full text-center py-16 flex flex-col items-center justify-center">
                <span className="text-4xl mb-3 opacity-20"><IoSearch /></span>
                <div className="text-sm text-gray-400 font-bold">
                  {debouncedQuery.length > 0
                    ? `No users matching "${debouncedQuery}"`
                    : "Type a username or creator name to search users."}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && searchTab === "content" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchResults.map((item) => (
              <div
                key={item._id || item.id}
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between bg-gray-50/50 hover:bg-orange-50/50 p-3.5 rounded-xl border border-gray-100 hover:border-brand-orange/30 group cursor-pointer transition-all duration-300 shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-inner">
                    <img
                      src={getValidImageSource(item)}
                      alt={item.title || "Content"}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    {item.isPremium && (
                      <span className="absolute top-1 left-1 bg-brand-orange text-[6px] text-white font-black px-1 rounded uppercase">
                        PRO
                      </span>
                    )}
                    {isComingSoon(item) && (
                      <span className="absolute top-1 right-1 bg-amber-500 text-[6px] text-white font-black px-1 rounded uppercase">
                        Soon
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-sm sm:text-base font-extrabold text-gray-800 group-hover:text-brand-orange transition-colors truncate">
                      {item.title || item.name || "Untitled"}
                    </div>
                    <div className="text-xs text-gray-400 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-gray-200/60 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-gray-600">
                        {formatCategory(item.category || item.type)}
                      </span>
                      {item.releaseYear && (
                        <>
                          <span>•</span>
                          <span>{item.releaseYear}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-gray-300 group-hover:text-brand-orange font-black text-lg transition-all transform group-hover:translate-x-1 pl-2">
                  ➔
                </div>
              </div>
            ))}

            {searchResults.length === 0 && (
              <div className="col-span-full text-center py-16 flex flex-col items-center justify-center">
                <span className="text-4xl mb-3 opacity-20"><IoSearch /></span>
                <div className="text-sm text-gray-400 font-bold">
                  No dynamic catalog results matching "{debouncedQuery}"
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchMoviesPage;