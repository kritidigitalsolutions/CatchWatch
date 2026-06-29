import React, { useState, useEffect } from 'react';

const TVShowsPage = () => {
  // Filter States - Ready to push directly into Backend Endpoint parameters
  const [selectedNetwork, setSelectedNetwork] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');

  // Dynamic Series Mock Data Array
  const [showsList] = useState([
    { id: 'tv1', title: 'ADITC-PART1', network: 'Originals', seasons: 'Season 1', rating: '7.2', status: 'Completed' },
    { id: 'tv2', title: 'ADITC-PART2', network: 'Originals', seasons: 'Season 2', rating: '7.5', status: 'Ongoing' },
    { id: 'tv3', title: 'Cyber Pulse Matrix', network: 'Sci-Fi Network', seasons: 'Season 3', rating: '8.9', status: 'Ongoing' },
    { id: 'tv4', title: 'Chronicles of Echoes', network: 'Premium Net', seasons: 'Season 1', rating: '6.4', status: 'Completed' },
    { id: 'tv5', title: 'Urban Shadows', network: 'Originals', seasons: 'Season 2', rating: '8.0', status: 'Ongoing' }
  ]);

  useEffect(() => {
    // BACKEND INTEGRATION PLACEHOLDER:
    // fetch(`https://api.catchwatch.com/v1/tvshows?network=${selectedNetwork}&status=${activeStatus}`)
    //   .then(res => res.json())
    //   .then(data => setShowsList(data));
    console.log('API Pipeline Request: Syncing TV Series utilizing filters:', { selectedNetwork, activeStatus });
  }, [selectedNetwork, activeStatus]);

  const filteredShows = showsList.filter(show => {
    if (selectedNetwork !== 'All' && show.network !== selectedNetwork) return false;
    if (activeStatus !== 'All' && show.status !== activeStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Context Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-800">TV Shows & Seasonal Series</h1>
          <p className="text-xs text-gray-400 mt-0.5">Binge-watch complete standard episodes, upcoming reality seasons, and exclusive show tracking blocks.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 font-bold text-xs self-start md:self-auto">
          {['All', 'Ongoing', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-2 rounded-lg transition tracking-wide ${
                activeStatus === status ? 'bg-brand-orange text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Network Origin Tag Filters Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {['All', 'Originals', 'Sci-Fi Network', 'Premium Net'].map((net) => (
          <button
            key={net}
            onClick={() => setSelectedNetwork(net)}
            className={`px-4 py-2 rounded-xl text-sm  font-bold border whitespace-nowrap transition ${
              selectedNetwork === net
                ? 'bg-white text-orange-600 border-brand-orange text-brand-orange'
                : 'bg-gray-200 border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {net === 'All' ? 'All Networks' : net}
          </button>
        ))}
      </div>

      {/* Dynamic Grid Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShows.map((show) => (
          <div 
            key={show.id} 
            className="bg-white border border-gray-200 hover:border-brand-orange/30 p-4 rounded-2xl shadow-sm flex gap-4 group cursor-pointer transition"
          >
            {/* Aspect Display Container Thumbnail */}
            <div className="w-20 h-28 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-400 font-black text-[10px] shadow-inner group-hover:scale-105 transform transition">
              SERIES
            </div>

            {/* Content Context Columns Metadata */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-gray-800 group-hover:text-brand-orange truncate transition">
                    {show.title}
                  </h4>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                    show.status === 'Ongoing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {show.status}
                  </span>
                </div>
                <p className="text-xs text-brand-orange font-bold mt-0.5">{show.seasons}</p>
                <span className="text-[10px] text-gray-400 font-medium block mt-2 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-max">
                  {show.network}
                </span>
              </div>

              {/* Score Layer row footer */}
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50 text-[11px] font-bold text-gray-500">
                <span>⭐ Critic: <span className="text-gray-800">{show.rating}</span></span>
                <span className="text-brand-orange hover:underline">View Episodes →</span>
              </div>
            </div>
          </div>
        ))}

        {filteredShows.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-16 text-center text-sm text-gray-400 font-medium shadow-sm">
            No dynamic episodic series matching chosen network tracking options found inside the database pool stack.
          </div>
        )}
      </div>

    </div>
  );
};

export default TVShowsPage;