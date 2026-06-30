import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdDownloadForOffline } from "react-icons/md";
import { movieApi } from '../api/movieApi'; // API import karein
import Loader from '../components/Loader';

const VideoPlayerPage = () => {
  const { slug } = useParams(); // URL slug parameter mapped to Mongoose unique schema field
  const navigate = useNavigate();

  // Component UI States
  const [movieData, setMovieData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [currentPlaybackTime] = useState('00:03');
  
  // Dynamic Loading & Error states for backend sync tracking
  // const [isLoading, setIsLoading] = useState(false);
  // const [movieData] = useState({
  //   title: 'bab INT Low res',
  //   description: 'This is a sample movie description that maps directly to the description parameter inside the Mongoose schema context node structure. Click read more to view all metadata properties allocated behind the specific stream asset layout profile.',
  //   genre: ['Action', 'Thriller'],
  //   releaseYear: 2022,
  //   duration: '2h',
  //   language: 'Hindi',
  //   poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop',
  //   banner: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
  //   videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Fallback stream asset
  //   rating: 8.5,
  //   isPremium: false,
  //   cast: [
  //     { id: 'c1', name: 'Actor One', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
  //     { id: 'c2', name: 'Actor Two', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' }
  //   ],
  //   likes: [],
  //   dislikes: []
  // });

  // BACKEND INTEGRATION PIPELINE EFFECT:
useEffect(() => {
    const fetchSingleMovie = async () => {
      setIsLoading(true);
      try {
        // API Call using slug
        const data = await movieApi.getMovieBySlug(slug);
        setMovieData(data);
      } catch (error) {
        console.error("API Error fetching movie:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchSingleMovie();
    }
  }, [slug]);
if (isLoading) return <Loader />;
  if (!movieData) return <div className="text-center p-20 text-white">Movie not found!</div>;
  return (
    <div className="max-w-6xl mx-auto w-full lg:grid lg:grid-cols-3 lg:gap-8 items-start space-y-6 lg:space-y-0">
      
      {/* LEFT AREA: Video Player Display Window & Meta Text (Takes 2 Columns on Desktop) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* OTT Video Player Component Window (Matches image_af79a0.jpg HUD precisely) */}
        <div className="relative w-full bg-black rounded-2xl aspect-video overflow-hidden shadow-xl group border border-neutral-800">
          
          {/* HTML5 Video Layer */}
          <video 
            src={movieData.videoUrl} 
            className="w-full h-full object-contain"
            onClick={() => setIsPlaying(!isPlaying)
              
            }
          />

          {/* Premium Video Interface Overlay HUD */}
          <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/80 via-transparent to-black/60 opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 z-10 text-white font-sans select-none">
            
            {/* Top Controller Ribbon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="hover:text-brand-orange text-lg transition font-bold">
                  ←
                </button>
                <span className="font-bold text-sm sm:text-base tracking-wide truncate max-w-xs sm:max-w-md">
                  {movieData.title}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="cursor-pointer hover:text-brand-orange">🔊</span>
                <span className="cursor-pointer hover:text-brand-orange">1.0x</span>
                <span className="cursor-pointer hover:text-brand-orange text-emerald-400">Auto</span>
              </div>
            </div>

            {/* Middle Content Track Controllers (Play/Pause/Rewind) */}
            <div className="flex items-center justify-center gap-8 sm:gap-12">
              <button className="text-2xl hover:text-brand-orange transition transform active:scale-95">
                🔂 <span className="text-[10px] block font-bold -mt-1">10s</span>
              </button>
              
              {/* Main Circular Action Trigger */}
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-orange text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-brand-orange/40 transform active:scale-90 transition hover:scale-105"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button className="text-2xl hover:text-brand-orange transition transform active:scale-95">
                🔁 <span className="text-[10px] block font-bold -mt-1">10s</span>
              </button>
            </div>

            {/* Player Bottom Bar HUD Timeline Metadata Track */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-gray-300 font-semibold px-0.5">
                <span>{currentPlaybackTime}</span>
                <span>{movieData.duration || '1:58:55'}</span>
              </div>
              
              {/* Progress Slider Track Line */}
              <div className="relative w-full h-1 bg-white/30 rounded-full cursor-pointer group/track">
                <div className="absolute top-0 left-0 h-full w-[12%] bg-brand-orange rounded-full relative">
                  <div className="absolute right-[-4px] top-[-3px] w-2.5 h-2.5 bg-brand-orange rounded-full shadow border border-white scale-0 group-hover/track:scale-100 transition-transform" />
                </div>
              </div>

              {/* Fullscreen Icon Trigger Frame Row */}
              <div className="flex justify-end pt-1">
                <button className="text-sm hover:text-brand-orange transition">🔲</button>
              </div>
            </div>

          </div>
        </div>

        {/* Title Block & Horizontal Functional Row Controllers (Matches image_af79a0.jpg) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {movieData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400 font-semibold mt-1">
                <span>{movieData.releaseYear}</span>
                <span>•</span>
                <span>{movieData.duration}</span>
                <span>•</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 text-[11px] uppercase tracking-wider">{movieData.language}</span>
                {movieData.isPremium && <span className="bg-brand-orange text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">PREMIUM</span>}
              </div>
            </div>

            {/* Quick Interactive Button Group Blocks Panel Stack */}
            <div className="flex gap-3">
              <button className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-gray-50 hover:bg-brand-light-bg/50 hover:text-brand-orange border border-gray-200/60 rounded-xl py-2 px-4 transition text-gray-500 font-bold text-xs gap-1">
                <span className="text-base"><MdDownloadForOffline /></span>
                <span>Download</span>
              </button>
              <button 
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center border rounded-xl py-2 px-4 transition font-bold text-xs gap-1 ${
                  isWishlisted 
                    ? 'bg-brand-light-bg border-brand-orange/30 text-brand-orange' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className="text-base">{isWishlisted ? '❤️' : '🤍'}</span>
                <span>Wishlist</span>
              </button>
              <button className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl py-2 px-4 transition text-gray-500 font-bold text-xs gap-1">
                <span className="text-base">↗️</span>
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Render Categories Genres Chips List */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {movieData.genre.map((g, i) => (
              <span key={i} className="bg-brand-light-bg border border-brand-orange/10 text-brand-orange font-bold text-xs px-3 py-1 rounded-xl">
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Description Section Frame with Collapsible Flag */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-2">
          <h3 className="text-base font-extrabold text-gray-800">Description</h3>
          <p className={`text-sm text-gray-500 font-medium leading-relaxed ${!isDescriptionExpanded && 'line-clamp-2'}`}>
            {movieData.description}
          </p>
          <button 
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="text-brand-orange font-bold text-xs hover:underline pt-1 block"
          >
            {isDescriptionExpanded ? 'Read Less ▲' : 'Read More ▼'}
          </button>
        </div>

      </div>

      {/* RIGHT AREA: Cast Configuration List Matrix (Takes 1 Column on Desktop Viewports) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-wider text-xs text-gray-400">
          Starring Cast Crew
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {movieData.cast.map((actor) => (
            <div 
              key={actor.id} 
              className="flex items-center gap-3 p-2 bg-gray-50/50 hover:bg-brand-light-bg/20 rounded-xl border border-gray-100 transition group cursor-pointer"
            >
              <img 
                src={actor.image} 
                alt={actor.name} 
                className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm group-hover:border-brand-orange/40 transition" 
              />
              <div>
                <div className="text-sm font-bold text-gray-700 group-hover:text-brand-orange transition">
                  {actor.name}
                </div>
                <div className="text-[11px] text-gray-400 font-semibold mt-0.5">Featured Talent</div>
              </div>
            </div>
          ))}

          {movieData.cast.length === 0 && (
            <div className="text-xs text-gray-400 font-medium p-4 text-center">
              No verified casting logs allocated for this production profile model.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default VideoPlayerPage;