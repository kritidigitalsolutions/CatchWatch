import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from '../components/Loader';
import { IoSearch } from "react-icons/io5";

// Global Content API import
import { searchContent, getAllContent } from '../api/contentApi';

const SearchMoviesPage = () => {
  const navigate = useNavigate();
  
  const isComingSoon = (item) => {
    return item?.isComingSoon === true || item?.isComingSoon === "true";
  };
  
  const [queryState, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  const [searchResults, setSearchResults] = useState([]);
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
    const fetchContent = async () => {
      const query = debouncedQuery.trim();

      setIsLoading(true);
      setError(null);
      
      try {
        let response;
        
        if (query.length > 0) {
          // Backend expects 'query' exactly as 'req.query.query'
          response = await searchContent({ query: query }); 
        } else {
          response = await getAllContent(); 
        }

        const fetchedData = response?.results || response?.content || response?.data || response || [];
        setSearchResults(Array.isArray(fetchedData) ? fetchedData : []);
        
      } catch (err) {
        console.error("Search API Error:", err);
        setError("Failed to fetch search results. Please check your connection.");
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [debouncedQuery]);

  // Navigation Click Handler
  const handleItemClick = (item) => {
    if (isComingSoon(item)) {
      alert("This content is coming soon! 🎬 Please check back shortly.");
      return;
    }
    // Backend se `item.type` aayega: "movie" ya "series"
    const type = typeof item.type === 'string' ? item.type : 'movie';
    const identifier = item.slug || item._id;

    if (!identifier) return;

    if (type.toLowerCase() === 'series' || type.toLowerCase() === 'tv') {
      navigate(`/tv-shows-episodes/${identifier}`);
    } else if (type.toLowerCase() === 'short') {
      navigate('/shorts'); 
    } else {
      navigate(`/watch/${identifier}`); 
    }
  };

  // Safe Category String Formatter (Fixes array issue)
  const formatCategory = (categoryData) => {
    if (Array.isArray(categoryData)) return categoryData[0] || "Content";
    if (typeof categoryData === 'string') return categoryData;
    return "Content";
  };

  // Safe Image Source Formatter
  const getValidImageSource = (item) => {
    if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.trim() !== "") return item.thumbnail;
    if (item.poster && typeof item.poster === 'string' && item.poster.trim() !== "") return item.poster;
    if (item.image && typeof item.image === 'string' && item.image.trim() !== "") return item.image;
    return FALLBACK_IMAGE;
  };
      if (isLoading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 py-6 px-4 sm:px-0">
      
      {/* Search Input */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center gap-4 group focus-within:border-brand-orange transition-all">
        <span className="text-xl text-gray-400 group-focus-within:text-brand-orange transition-colors"><IoSearch /></span>
        <input
          type="text"
          placeholder="Search for Movies & TV Shows..."
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

      {/* Content Display */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 min-h-[50vh]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
            {debouncedQuery.length > 0
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

        {!isLoading && !error && (
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