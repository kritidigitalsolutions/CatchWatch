import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaTrashAlt, FaPlay, FaVideo } from 'react-icons/fa';
import Loader from '../components/Loader';

// APIs import karein (Apne actual file path ke hisaab se adjust karein)
import { getMyReels, deleteReel } from '../api/reelsApi';

const MyVideosPage = () => {
  const navigate = useNavigate();

  // States
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallback Thumbnail if a reel doesn't have one
  const FALLBACK_THUMBNAIL = "https://img.freepik.com/premium-photo/glowing-orange-neon-play-button-icon-dark-background_989822-6247.jpg";

  // Fetch Only User's Videos on Mount
  useEffect(() => {
    const fetchMyVideos = async () => {
      // 1. Strict Auth Check
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      
      if (!token) {
        setError("You must be logged in to view your uploaded videos.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // 2. Call the specific API for My Reels
        const response = await getMyReels();
        
        // Handle variations in backend response structures
        const fetchedData = response?.reels || response?.data || response?.results || response || [];
        setVideos(Array.isArray(fetchedData) ? fetchedData : []);
      } catch (err) {
        console.error("Error fetching user's videos:", err);
        if (err.response && err.response.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load your personal video library. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyVideos();
  }, []);

  // Handle Video Delete Request
  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this video? This action cannot be undone.");
    if (!confirmDelete) return;

    // Optimistic UI Update: Instantly remove video from the grid
    const previousVideos = [...videos];
    setVideos(prev => prev.filter(v => v._id !== id && v.id !== id));

    try {
      await deleteReel(id);
    } catch (error) {
      console.error(`Failed to delete video ${id}:`, error);
      alert("An error occurred while trying to delete the video. Please try again.");
      // Rollback UI if the API call fails
      setVideos(previousVideos);
    }
  };

  // Navigate to Video Player
  const handlePlayVideo = (id) => {
    navigate(`/reels/${id}`); 
  };

  // Format Date for Display
  const formatDate = (dateString) => {
    if (!dateString) return "Recently uploaded";
    return new Date(dateString).toLocaleDateString("en-US", { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
  };

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 py-6 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
            <FaArrowLeft />
          </button>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-3">
            <FaVideo /> My Uploaded Reels
          </h1>
        </div>
        <button 
          onClick={() => navigate('/upload')}
          className="bg-white text-brand-orange text-xs sm:text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm"
        >
          + Upload New
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 min-h-[60vh]">
        
        {/* Error State */}
        {error && (
          <div className="text-center py-10 flex flex-col items-center">
            <p className="text-red-500 font-bold mb-4">{error}</p>
            {(error.includes("logged in") || error.includes("Session")) && (
              <button onClick={() => navigate('/login')} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
                Log In Securely
              </button>
            )}
          </div>
        )}

        {/* Video Grid for Personal Uploads */}
        {!error && videos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {videos.map((video) => {
              const id = video._id || video.id;
              // Backend should ideally generate a thumbnail for videos, otherwise we use the fallback
              const thumbnail = video.thumbnailUrl || video.poster || FALLBACK_THUMBNAIL;
              
              return (
                <div 
                  key={id} 
                  className="group relative bg-gray-900 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 aspect-[9/16]"
                  onClick={() => handlePlayVideo(id)}
                >
                  {/* Thumbnail Image */}
                  <img 
                    src={thumbnail} 
                    alt={video.title || "My Uploaded Video"} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Play Button Overlay (Visible on Hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="w-12 h-12 bg-brand-orange/90 rounded-full flex items-center justify-center text-white pl-1 shadow-xl backdrop-blur-sm transform scale-75 group-hover:scale-100 transition-transform">
                      <FaPlay />
                    </div>
                  </div>

                  {/* Top Bar: Delete Action */}
                  <div className="absolute top-0 left-0 w-full p-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/70 to-transparent">
                    <button 
                      onClick={(e) => handleDelete(e, id)}
                      className="bg-red-500/90 hover:bg-red-600 text-white p-2.5 rounded-full shadow-sm transform hover:scale-110 transition backdrop-blur-sm"
                      title="Permanently Delete Video"
                    >
                      <FaTrashAlt className="text-xs" />
                    </button>
                  </div>

                  {/* Bottom Bar: Video Meta Info */}
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white">
                    <h3 className="font-bold text-sm truncate">
                      {video.title || "My Studio Reel"}
                    </h3>
                    <p className="text-[10px] text-gray-300 font-medium mt-1.5 flex items-center gap-1.5">
                      <span>•</span>
                      {formatDate(video.createdAt || video.uploadDate)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State (When user has 0 uploads) */}
        {!error && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-200">
              <FaVideo className="text-4xl text-gray-300" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-700 mb-2">No videos uploaded yet</h3>
            <p className="text-sm font-medium mb-6 text-center max-w-sm leading-relaxed">
              Your personal studio library is empty. Upload your first reel and share it with the CatchWatch community!
            </p>
            <button 
              onClick={() => navigate('/upload')}
              className="bg-brand-orange text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-brand-orange/90 transition transform active:scale-95"
            >
              Upload Your First Reel
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyVideosPage;