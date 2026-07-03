import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaRegHeart, FaItunesNote, FaPlay } from "react-icons/fa";
import { GiSaveArrow } from "react-icons/gi";
import { FaShareNodes } from "react-icons/fa6";
import { LuMessageCircleMore } from "react-icons/lu";
import Loader from '../components/Loader';

// Apni API import karein (path verify kar lein)
import { getShortFilms } from '../api/shortApi'; 

// Individual Video Component
const ShortVideo = ({ video, isActive }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Jab video active view me aayega, tabhi play hoga
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.log("Autoplay prevented", e));
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Rewind for next time
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
        src={video.videoUrl}
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
          <span className="text-xs font-bold mt-1 shadow-sm">{video.likes?.length || 0}</span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
            <LuMessageCircleMore />
          </div>
          <span className="text-xs font-bold mt-1 shadow-sm">0</span>
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
          {/* Channel / User Image */}
          <div className="w-9 h-9 rounded-full bg-brand-orange flex items-center justify-center font-bold text-sm border border-white/50 overflow-hidden">
            {video.channelImage ? (
              <img src={video.channelImage} alt="channel" className="w-full h-full object-cover" />
            ) : (
              "CW"
            )}
          </div>
          <span className="font-bold tracking-wide text-sm sm:text-base line-clamp-1">
            {video.title || "Unknown Short"}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-200 font-medium mb-2 line-clamp-2">
          {video.description || "Enjoy this short film exclusively on CatchWatch."}
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
  const [shorts, setShorts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchShorts = async () => {
      setIsLoading(true);
      try {
        const response = await getShortFilms({ limit: 50 });
        // Adjust this according to your actual API response structure (e.g., response.data or response.shortFilms)
        const data = response?.shortFilms || response?.data || response || [];
        setShorts(data);
      } catch (err) {
        console.error("API Error fetching shorts:", err);
        setError("Failed to load Shorts at the moment.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchShorts();
  }, []);

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

  if (error || shorts.length === 0) {
    return (
      <div className="max-w-md mx-auto w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] my-2 md:my-6 flex flex-col items-center justify-center text-white">
        <h2 className="text-xl font-bold">Oops!</h2>
        <p className="text-sm text-gray-400 mt-2">{error || "No shorts available right now."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] my-2 md:my-6">
      
      {/* Absolute Transparent Frame Header (Stays on top of all videos) */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-50 text-white pointer-events-none">
        <h1 className="text-xl font-black tracking-wide drop-shadow-md">Shorts</h1>
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
        {shorts.map((video, index) => (
          <ShortVideo 
            key={video._id || index} 
            video={video} 
            isActive={index === activeIndex} 
          />
        ))}
      </div>
    </div>
  );
};

export default ShortsPage;