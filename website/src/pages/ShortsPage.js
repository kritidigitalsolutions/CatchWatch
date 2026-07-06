import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaRegHeart, FaItunesNote, FaPlay } from "react-icons/fa";
import { GiSaveArrow } from "react-icons/gi";
import { FaShareNodes } from "react-icons/fa6";
import { LuMessageCircleMore } from "react-icons/lu";
import Loader from '../components/Loader';

// API import for global reels
import { getReelsFeed } from '../api/reelsApi'; 

// Individual Video Component
const ShortVideo = ({ video, isActive }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Autoplay logic when video comes into view
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.log("Autoplay prevented by browser", e));
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Rewind for next time it scrolls into view
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full h-full snap-start relative bg-zinc-950 flex-shrink-0">
      
      {/* Video Element */}
      <video
        ref={videoRef}
        // Fallback checks for different possible backend keys for the video URL
        src={video.videoUrl || video.url || video.video}
        className="w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        onClick={togglePlay}
      />

      {/* Play Icon Overlay (Visible when paused manually) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center text-white text-2xl backdrop-blur-sm pl-1">
            <FaPlay />
          </div>
        </div>
      )}

      {/* Floating System Actions Widget Stack */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-5 items-center z-20 text-white">
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
            <FaRegHeart />
          </div>
          <span className="text-xs font-bold mt-1 shadow-sm">
            {video.likes?.length || video.likeCount || 0}
          </span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
            <LuMessageCircleMore />
          </div>
          <span className="text-xs font-bold mt-1 shadow-sm">
            {video.comments?.length || video.commentCount || 0}
          </span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
            <GiSaveArrow />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wide mt-0.5">Save</span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
            <FaShareNodes />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wide mt-0.5">Share</span>
        </button>
      </div>

      {/* Bottom User Description Meta Interface */}
      <div className="absolute bottom-6 left-4 right-20 z-20 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 rounded-xl backdrop-blur-[2px] border border-white/5">
        <div className="flex items-center gap-3 mb-2">
          {/* Author/Channel Image */}
          <div className="w-9 h-9 rounded-full bg-brand-orange flex items-center justify-center font-bold text-sm border border-white/50 overflow-hidden">
            {video.authorImage || video.channelImage || video.author?.profileImage ? (
              <img 
                src={video.authorImage || video.channelImage || video.author?.profileImage} 
                alt="channel" 
                className="w-full h-full object-cover" 
              />
            ) : (
              "CW"
            )}
          </div>
          <span className="font-bold tracking-wide text-sm sm:text-base line-clamp-1">
            {video.author?.name || video.authorName || video.title || "@user"}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-200 font-medium mb-2 line-clamp-2">
          {video.description || video.caption || "Enjoy this reel exclusively on CatchWatch."}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span><FaItunesNote /></span>
          <span className="truncate bg-white/10 px-2 py-0.5 rounded text-[11px]">
            Original Audio - CatchWatch Music
          </span>
        </div>
      </div>

    </div>
  );
};

// Main Page Component
const ShortsPage = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchGlobalReels = async () => {
      setIsLoading(true);
      try {
        // Fetching global reels feed (No specific user filters)
        const response = await getReelsFeed({ limit: 50 });
        
        // Extract array depending on how your backend formats the response
        const data = response?.reels || response?.data || response || [];
        setReels(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("API Error fetching reels:", err);
        setError("Failed to load Reels at the moment.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalReels();
  }, []);

  // Premium status check effect
  useEffect(() => {
    if (reels.length === 0) return;
    const currentReel = reels[activeIndex];
    
    if (currentReel && currentReel.isPremium) {
      const isUserPremium = localStorage.getItem("userIsPremium") === "true";
      if (!isUserPremium) {
        alert("This reel is premium content. Redirecting to subscription plans...");
        navigate('/subscription');
      }
    }
  }, [activeIndex, reels, navigate]);

  // Handle Scroll logic to detect which video is currently in view
  const handleScroll = (e) => {
    const scrollPosition = e.target.scrollTop;
    const containerHeight = e.target.clientHeight;
    // Calculate the index of the video currently fully in view
    const newActiveIndex = Math.round(scrollPosition / containerHeight);
    
    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);
    }
  };

  if (isLoading) return <Loader />;

  if (error || reels.length === 0) {
    return (
      <div className="max-w-md mx-auto w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] my-2 md:my-6 flex flex-col items-center justify-center text-white">
        <h2 className="text-xl font-bold">Oops!</h2>
        <p className="text-sm text-gray-400 mt-2">{error || "No reels available right now."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] my-2 md:my-6">
      
      {/* Absolute Transparent Frame Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-50 text-white pointer-events-none">
        <h1 className="text-xl font-black tracking-wide drop-shadow-md">Reels</h1>
        <div className="flex gap-4 text-xl pointer-events-auto">
          <button className="hover:text-brand-orange transition"><FaSearch /></button>
          <button className="hover:text-brand-orange transition">⋮</button>
        </div>
      </div>

      {/* Scrollable Video Feed Container */}
      <div 
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        onScroll={handleScroll}
      >
        {reels.map((video, index) => (
          <ShortVideo 
            key={video._id || video.id || index} 
            video={video} 
            isActive={index === activeIndex} 
          />
        ))}
      </div>
    </div>
  );
};

export default ShortsPage;