import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

const TopChartsPage = () => {
//   const navigate = useNavigate();
  const [chartRegion, setChartRegion] = useState('Global');

  // Top 10 Mock Framework Data Matrix
  const [topTenItems] = useState([
    { rank: 1, title: 'The Past', rating: '9.0', streams: '2.4M streams', type: 'Movie', genre: 'Horror', isPremium: true },
    { rank: 2, title: 'Rugna The Film', rating: '8.5', streams: '1.9M streams', type: 'Movie', genre: 'Drama', isPremium: false },
    { rank: 3, title: 'ADITC-PART2', rating: '7.5', streams: '1.5M streams', type: 'TV Show', genre: 'Sci-Fi', isPremium: true },
    { rank: 4, title: 'metadoor', rating: '6.8', streams: '980K streams', type: 'Movie', genre: 'Thriller', isPremium: false },
    { rank: 5, title: 'ADITC-PART1', rating: '7.2', streams: '840K streams', type: 'TV Show', genre: 'Drama', isPremium: false },
    { rank: 6, title: 'bab INT Low res', rating: '4.2', streams: '610K streams', type: 'Movie', genre: 'Action', isPremium: false }
  ]);

  useEffect(() => {
    // BACKEND INTEGRATION PLACEHOLDER:
    // fetch(`https://api.catchwatch.com/v1/charts?region=${chartRegion}`)
    //   .then(res => res.json())
    //   .then(data => setTopTenItems(data));
    console.log(`API Trigger: Fetching Top 10 charts for: ${chartRegion}`);
  }, [chartRegion]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Top Billboard Header Card */}
      <div className="bg-gradient-to-r from-neutral-900 to-zinc-800 text-white border border-neutral-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-brand-orange text-xs font-black uppercase tracking-widest bg-brand-orange/10 px-3 py-1 rounded-full border border-brand-orange/20">Official Rankings</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">Top 10 Media Standings</h1>
          <p className="text-xs text-neutral-400 mt-1">Live updates aggregated directly from streaming throughput data logs.</p>
        </div>

        {/* Region Filter Controller Switch */}
        <div className="flex bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 self-start md:self-auto font-bold text-xs">
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
        </div>
      </div>

      {/* Leaderboard Stack Row Modules */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-3 sm:p-6 space-y-4">
        {topTenItems.map((item) => (
          <div 
            key={item.rank}
            className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/50 hover:bg-brand-light-bg/30 border border-gray-100 rounded-xl transition group cursor-pointer"
          >
            <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
              {/* Massive Rank Dynamic Digit Component */}
              <span className={`text-3xl sm:text-5xl font-black tracking-tighter w-8 sm:w-12 text-center select-none ${
                item.rank === 1 ? 'text-brand-orange' : item.rank === 2 ? 'text-amber-500' : item.rank === 3 ? 'text-amber-600' : 'text-gray-300'
              }`}>
                {item.rank}
              </span>

              {/* Aspect Ratio Box Graphic */}
              <div className="w-12 sm:w-16 aspect-[2/3] bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-[9px] text-gray-400 shadow-inner group-hover:scale-105 transform transition">
                POSTER
              </div>

              {/* Title Metadata Container */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-gray-800 group-hover:text-brand-orange truncate transition">
                    {item.title}
                  </span>
                  {item.isPremium && (
                    <span className="bg-brand-orange text-[8px] text-white font-black px-1.5 py-0.5 rounded flex-shrink-0">
                      PRO
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 font-semibold mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="bg-gray-200/60 px-2 py-0.5 rounded text-[10px] text-gray-500">{item.type}</span>
                  <span>•</span>
                  <span>{item.genre}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline text-brand-orange/90">📈 {item.streams}</span>
                </div>
              </div>
            </div>

            {/* Metric Score Indicators Panel */}
            <div className="text-right pl-4">
              <div className="text-sm font-black text-gray-800">⭐ {item.rating}</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">Rating Score</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopChartsPage;