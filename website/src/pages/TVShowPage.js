import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
// Make sure to adjust the import path based on where you saved your TV Shows API functions
import { getTvShows } from '../api/tvShowsAps'; 

const TVShowsPage = () => {
  const navigate = useNavigate();
  
  // Filter States
  const [selectedNetwork, setSelectedNetwork] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');

  // Dynamic API States
  const [showsList, setShowsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop";

  useEffect(() => {
    const fetchShows = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTvShows({ limit: 100 });
        // Aapke postman response me array ka naam "dramas" hai
        const fetchedShows = response?.dramas || response || [];
        setShowsList(fetchedShows);
      } catch (err) {
        console.error("API Pipeline Request Failed:", err);
        setError("Unable to sync TV Series data at the moment.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchShows();
  }, []);

  // Client-side filtering logic
  const filteredShows = showsList.filter(show => {
    // Status Filter (Case insensitive check kyunki API me lowercase 'ongoing' hai)
    if (activeStatus !== 'All') {
      const apiStatus = show.status ? show.status.toLowerCase() : '';
      if (apiStatus !== activeStatus.toLowerCase()) return false;
    }

    // Network Filter (API me network field nahi hai, fallback to 'Originals' for display)
    const showNetwork = show.network || 'Originals';
    if (selectedNetwork !== 'All' && showNetwork !== selectedNetwork) return false;
    
    return true;
  });

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="text-center p-20 text-white flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
        <p className="text-gray-500">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full py-6">
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
              className={`px-4 py-2 rounded-lg transition font-[700] tracking-wide ${
                activeStatus === status ? 'bg-gray-200 text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
        {filteredShows.map((show) => {
          // Capitalize status for UI display
          const displayStatus = show.status ? show.status.charAt(0).toUpperCase() + show.status.slice(1) : 'Unknown';
          
          return (
            <div 
              key={show._id} 
              onClick={() => navigate(`/tv-shows-episodes/${show._id}`)}
              className="bg-white border border-gray-200 hover:border-orange-300 p-4 rounded-2xl shadow-sm flex gap-4 group cursor-pointer transition"
            >
              {/* Aspect Display Container Thumbnail */}
              <div className="w-20 h-28 bg-neutral-900 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-400 font-black text-[10px] shadow-inner group-hover:scale-105 transform transition overflow-hidden relative">
                <img 
                  src={show.poster && show.poster.trim() !== "" ? show.poster : FALLBACK_POSTER} 
                  alt={show.title} 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100"
                />
                {show.isPremium && (
                  <span className="absolute top-1 left-1 bg-brand-orange text-[7px] text-white font-black px-1 rounded uppercase">
                    PRO
                  </span>
                )}
              </div>

              {/* Content Context Columns Metadata */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-gray-800 group-hover:text-orange-600 truncate transition">
                      {show.title}
                    </h4>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md flex-shrink-0 ${
                      displayStatus === 'Ongoing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {displayStatus}
                    </span>
                  </div>
                  {/* Using totalEpisodes as fallback for seasons */}
                  <p className="text-xs text-brand-orange font-bold mt-0.5">
                    {show.totalEpisodes ? `${show.totalEpisodes} Episodes` : 'Season 1'}
                  </p>
                  <span className="text-[10px] text-gray-400 font-medium block mt-2 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-max truncate max-w-full">
                    {show.network || 'Originals'} • {show.genre?.length > 0 ? show.genre[0] : 'Drama'}
                  </span>
                </div>

                {/* Score Layer row footer */}
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50 text-[11px] font-bold text-gray-500">
                  <span>⭐ Critic: <span className="text-gray-800">{show.rating ? show.rating.toFixed(1) : '0.0'}</span></span>
                  <span className="text-brand-orange group-hover:underline">View Episodes →</span>
                </div>
              </div>
            </div>
          );
        })}

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