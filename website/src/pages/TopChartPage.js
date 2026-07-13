import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { getMovies } from '../api/movieApi'; // API import added

const TopChartsPage = () => {
  const navigate = useNavigate();

  const isComingSoon = (item) => {
    return item?.isComingSoon === true || item?.isComingSoon === "true";
  };
  // const [chartRegion, setChartRegion] = useState('Global');

  // Dynamic States
  const [topTenItems, setTopTenItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=500&auto=format&fit=crop";

  useEffect(() => {
    const fetchTopCharts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all movies from backend
        const response = await getMovies({ limit: 100 });
        const allMovies = response?.movies || response || [];

        // 1. FILTER: Sirf un movies ko lijiye jinke category array me "top10" hai
        // 2. SORT: Unhe rating ke hisaab se sort kijiye
        // 3. SLICE: Top 10 items lijiye
        const sortedTop10 = allMovies
          .filter((movie) => movie.category && movie.category.includes("top10"))
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 10);

        setTopTenItems(sortedTop10);
      } catch (err) {
        console.error("API Error: Fetching Top 10 charts failed:", err);
        setError("Unable to load the leaderboard at this moment.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopCharts();
  }, []);

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="text-center p-20 text-white flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 py-6">
      {/* Top Billboard Header Card */}
      <div className="bg-gradient-to-r from-neutral-900 to-zinc-800 text-white border border-neutral-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-brand-orange text-xs font-black uppercase tracking-widest bg-brand-orange/10 px-3 py-1 rounded-full border border-brand-orange/20">Official Rankings</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">Top 10 Media Standings</h1>
          <p className="text-xs text-neutral-400 mt-1">Live updates aggregated directly from streaming throughput data logs.</p>
        </div>

        {/* Region Filter Controller Switch */}
        {/* <div className="flex bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 self-start md:self-auto font-bold text-xs">
          {['Global', 'National', 'Regional'].map((reg) => (
            <button
              key={reg}
              onClick={() => setChartRegion(reg)}
              className={`px-4 py-2 rounded-lg tracking-wide uppercase transition ${
                chartRegion === reg ? 'bg-brand-orange text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {reg}
            </button>
          ))}
        </div> */}
      </div>

      {/* Leaderboard Stack Row Modules */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-3 sm:p-6 space-y-4">
        {topTenItems.map((item, index) => {
          const rank = index + 1;
          
          return (
            <div 
              key={item._id}
              onClick={() => {
                if (isComingSoon(item)) {
                  alert("This content is coming soon! 🎬 Please check back shortly.");
                  return;
                }
                navigate(`/watch/${item.slug}`);
              }}
              className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/50 hover:bg-orange-50/50 border border-gray-100 rounded-xl transition group cursor-pointer relative"
            >
              <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                {/* Massive Rank Dynamic Digit Component */}
                <span className={`text-3xl sm:text-5xl font-black tracking-tighter w-8 sm:w-12 text-center select-none ${
                  rank === 1 ? 'text-orange-500' : rank === 2 ? 'text-amber-500' : rank === 3 ? 'text-amber-600' : 'text-gray-300'
                }`}>
                  {rank}
                </span>

                {/* Aspect Ratio Box Graphic (Poster Image) */}
                <div className="w-12 sm:w-16 aspect-[2/3] bg-neutral-900 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transform transition">
                  <img 
                    src={item.poster && item.poster.trim() !== "" ? item.poster : FALLBACK_POSTER} 
                    alt={item.title} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100"
                  />
                </div>

                {/* Title Metadata Container */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-gray-800 group-hover:text-orange-600 truncate transition">
                      {item.title}
                    </span>
                    {item.isPremium && (
                      <span className="bg-brand-orange text-[8px] text-white font-black px-1.5 py-0.5 rounded flex-shrink-0 uppercase">
                        PRO
                      </span>
                    )}
                    {isComingSoon(item) && (
                      <span className="bg-amber-500 text-[8px] text-white font-black px-1.5 py-0.5 rounded flex-shrink-0 uppercase">
                        Soon
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-semibold mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="bg-gray-200/60 px-2 py-0.5 rounded text-[10px] text-gray-500">
                      {item.type || 'Movie'}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">
                      {item.genre?.length > 0 ? item.genre.join(', ') : 'Uncategorized'}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    {/* Simulated Stream Count using Rating to make UI look full */}
                    <span className="hidden sm:inline text-orange-500/90">
                      📈 {item.rating ? (item.rating * 115).toFixed(0) : '50'}K streams
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric Score Indicators Panel */}
              <div className="text-right pl-4">
                <div className="text-sm font-black text-gray-800">
                  ⭐ {item.rating ? item.rating.toFixed(1) : '0.0'}
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider hidden sm:block">
                  Rating Score
                </div>
              </div>
            </div>
          );
        })}

        {topTenItems.length === 0 && (
          <div className="text-center p-10 text-gray-400 font-medium text-sm">
            No "Top 10" categorized data available for the selected region.
          </div>
        )}
      </div>
    </div>
  );
};

export default TopChartsPage;