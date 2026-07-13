import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdDownloadForOffline } from "react-icons/md";
import { FaPlay, FaTrashAlt } from "react-icons/fa";

const DownloadsPage = () => {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState([]);

  useEffect(() => {
    // Component load hone par localStorage se downloads fetch karein
    const savedDownloads = JSON.parse(localStorage.getItem('offlineDownloads') || '[]');
    setDownloads(savedDownloads);
  }, []);

  const handleDelete = (id) => {
    const updatedDownloads = downloads.filter(item => item.id !== id);
    setDownloads(updatedDownloads);
    localStorage.setItem('offlineDownloads', JSON.stringify(updatedDownloads));
  };

  return (
    <div className="max-w-4xl mx-auto w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[70vh] my-6">
      
      {/* Structural Segment Header Title */}
      <div className="bg-brand-orange text-white p-5 flex items-center gap-4">
        <button className="text-2xl font-bold cursor-pointer hover:scale-105 transition" onClick={() => navigate(-1)}>←</button>
        <h1 className="text-base sm:text-xl font-black tracking-tight">Offline Files Vault</h1>
      </div>

      {/* Meta Analytics Summary Bar Counter Panel */}
      <div className="bg-orange-50/50 border-b border-gray-100 p-4 flex items-center justify-between text-xs sm:text-sm font-bold text-gray-600">
        <span className="flex items-center gap-2">
          <MdDownloadForOffline className="text-brand-orange text-lg" />
          {downloads.length} individual cache streams validated locally
        </span>
        {downloads.length > 0 && (
          <span className="text-[10px] uppercase tracking-wider text-gray-400">Device Storage</span>
        )}
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 p-6">
        {downloads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((item) => (
              <div key={item?.id || Math.random()} className="group relative bg-gray-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all aspect-video">
                
                {/* Thumbnail */}
                <img 
                  src={item?.thumbnail} 
                  alt={item?.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" 
                />

                {/* Overlays */}
                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                  {/* Top Bar: Delete */}
                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleDelete(item?.id)}
                      className="bg-black/50 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-sm transition"
                    >
                      <FaTrashAlt className="text-xs" />
                    </button>
                  </div>

                  {/* Play Button & Details */}
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-white font-bold text-sm line-clamp-1 drop-shadow-md">
                        {item?.title || "Untitled Movie"}
                      </h3>
                      <p className="text-gray-300 text-[10px] font-semibold mt-0.5">
                        Downloaded: {item?.downloadedAt ? new Date(item.downloadedAt).toLocaleDateString() : "Recently"}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        // EXACT MOVIES PAGE LOGIC APPLIED HERE
                        // Primary check for slug, fallback to _id or id
                        const targetSlug = item?.slug || item?._id || item?.id;
                        
                        if (targetSlug) {
                          navigate(`/watch/${targetSlug}`);
                        } else {
                          alert("This downloaded file is corrupted. Please delete it and download again.");
                        }
                      }}
                      className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center pl-1 shadow-lg hover:scale-105 transition transform"
                    >
                      <FaPlay className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Centered Presentation Block Segment (Empty State) */
          <div className="h-full flex flex-col justify-center items-center text-center py-20">
            <div className="w-20 h-20 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-3xl shadow-sm border border-brand-orange/10 mb-6 animate-bounce">
              <MdDownloadForOffline />
            </div>
            <h2 className="text-xl font-black tracking-tight text-gray-800">No Offline Files Found</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mt-2 leading-relaxed font-medium">
              Downloaded movie assets, shows, and reel files stored dynamically locally onto device storage arrays appear structured right here.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="mt-6 bg-brand-orange text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition"
            >
              Explore Content
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;