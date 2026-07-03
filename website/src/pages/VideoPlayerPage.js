import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdDownloadForOffline } from "react-icons/md";
import {
  FaPlay, FaPause, FaExpand, FaCompress,
  FaVolumeUp, FaVolumeMute, FaStepBackward, FaStepForward, FaCog
} from "react-icons/fa";

// Yahan getAllEpisodesByTvShowId ki jagah getEpisodeById import karein
import { getMovieBySlug } from '../api/movieApi';
import { getEpisodeById } from '../api/episodesApi'; // SAHI API IMPORT
import Loader from '../components/Loader';

const VideoPlayerPage = () => {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);

  const [mediaData, setMediaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);

  let controlsTimeout;

  const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop";

  useEffect(() => {
    const fetchMediaContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let response;
        let data;

        if (slug) {
          response = await getMovieBySlug(slug);
          data = response?.movie || response;
        }
        else if (id) {
          // YAHAN getEpisodeById USE KARNA HAI
          response = await getEpisodeById(id);
          data = response?.episode || response?.data || response;
        }

        if (data) {
          setMediaData(data);
        } else {
          setError("Media details could not be retrieved.");
        }
      } catch (err) {
        console.error("API Error fetching media:", err);
        setError("Failed to connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug || id) fetchMediaContent();
  }, [slug, id]);

  // --- ERROR FIX: SAFE PLAY/PAUSE FUNCTION ---
  const togglePlay = () => {
    if (!videoRef.current || !mediaData?.videoUrl) return; // Agar video url nahi hai to play mat karo

    if (videoRef.current.paused) {
      // Promise handle karna zaroori hai error bachane k liye
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error("Playback interrupted or blocked:", error);
        });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setProgress((current / total) * 100);
    setCurrentTime(formatTime(current));
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(formatTime(videoRef.current.duration));
    }
  };

  const handleProgressScrub = (e) => {
    const progressBar = e.currentTarget;
    const clickPosition = e.nativeEvent.offsetX;
    const totalWidth = progressBar.clientWidth;
    const newTime = (clickPosition / totalWidth) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    if (!isMuted) setVolume(0);
    else setVolume(1);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackSpeed = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    if (isPlaying) {
      controlsTimeout = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  // --------------------------------

  if (isLoading) return <Loader />;

  if (error || !mediaData) {
    return (
      <div className="text-center p-20 text-white flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
        <p className="text-gray-500">{error || "Content not found!"}</p>
        <button onClick={() => navigate(-1)} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full lg:grid lg:grid-cols-3 lg:gap-8 items-start space-y-6 lg:space-y-0 py-8 px-4 sm:px-6">

      <div className="lg:col-span-2 space-y-6">

        {/* --- CUSTOM VIDEO PLAYER CONTAINER --- */}
        <div
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          className={`relative w-full bg-black rounded-2xl aspect-video overflow-hidden shadow-2xl border border-neutral-800 group select-none ${isFullscreen ? 'rounded-none border-none' : ''}`}
        >
          <video
            ref={videoRef}
            src={mediaData.videoUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />

          <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>

            <div className="bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start pointer-events-none">
              <button onClick={() => isFullscreen ? document.exitFullscreen() : navigate(-1)} className="text-white hover:text-orange-500 transition text-2xl drop-shadow-md pointer-events-auto">
                ←
              </button>
              <div className="text-white font-bold truncate max-w-sm drop-shadow-md">
                {mediaData.title} {mediaData.episodeNumber ? `(Ep ${mediaData.episodeNumber})` : ''}
              </div>
            </div>

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 bg-orange-600/90 text-white rounded-full flex items-center justify-center text-3xl shadow-xl shadow-orange-900/50 pl-1 backdrop-blur-sm">
                  <FaPlay />
                </div>
              </div>
            )}

            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-10 mt-auto">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white text-xs font-semibold w-10">{currentTime}</span>
                <div className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative group/scrub" onClick={handleProgressScrub}>
                  <div className="absolute top-0 left-0 h-full bg-orange-600 rounded-full relative" style={{ width: `${progress}%` }}>
                    <div className="absolute right-[-6px] top-[-4px] w-3.5 h-3.5 bg-white rounded-full shadow scale-0 group-hover/scrub:scale-100 transition-transform" />
                  </div>
                </div>
                <span className="text-white text-xs font-semibold w-10">{duration}</span>
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-5">
                  <button className="hover:text-orange-500 transition"><FaStepBackward /></button>
                  <button onClick={togglePlay} className="text-xl hover:text-orange-500 transition w-5 flex justify-center">
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                  <button className="hover:text-orange-500 transition"><FaStepForward /></button>

                  <div className="flex items-center gap-2 group/vol">
                    <button onClick={toggleMute} className="hover:text-orange-500 transition text-lg">
                      {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                    <input
                      type="range" min="0" max="1" step="0.05" value={volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/vol:w-16 opacity-0 group-hover/vol:opacity-100 transition-all duration-300 origin-left accent-orange-600 cursor-pointer h-1 bg-white/30 rounded-lg appearance-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-5 relative">
                  <div className="relative">
                    <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="hover:text-orange-500 transition flex items-center gap-1">
                      <FaCog /> <span className="text-xs font-bold">{playbackSpeed}x</span>
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-8 right-0 bg-neutral-900/95 border border-white/10 rounded-lg py-2 flex flex-col w-24 backdrop-blur-md z-20 shadow-xl">
                        {[0.5, 1, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => changePlaybackSpeed(speed)}
                            className={`text-xs text-left px-4 py-1.5 hover:bg-white/10 ${playbackSpeed === speed ? 'text-orange-500 font-bold' : 'text-gray-300'}`}
                          >
                            {speed === 1 ? 'Normal' : `${speed}x`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="text-xs font-bold border border-white/30 px-1.5 rounded hover:border-orange-500 hover:text-orange-500 transition">HD</button>
                  <button onClick={toggleFullscreen} className="hover:text-orange-500 transition text-lg">
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title Block & Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {mediaData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400 font-semibold mt-1">
                {mediaData.episodeNumber && <span>Episode {mediaData.episodeNumber}</span>}
                {mediaData.releaseYear && (
                  <><span>•</span><span>{mediaData.releaseYear}</span></>
                )}
                {mediaData.duration && (
                  <><span>•</span><span>{mediaData.duration} mins</span></>
                )}
                {mediaData.isPremium && <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">PREMIUM</span>}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-200/60 rounded-xl py-2 px-4 transition text-gray-500 font-bold text-xs gap-1">
                <span className="text-base"><MdDownloadForOffline /></span>
                <span>Download</span>
              </button>
              <button onClick={() => setIsWishlisted(!isWishlisted)} className={`flex-1 sm:flex-none flex flex-col items-center justify-center border rounded-xl py-2 px-4 transition font-bold text-xs gap-1 ${isWishlisted ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                <span className="text-base">{isWishlisted ? '❤️' : '🤍'}</span>
                <span>Wishlist</span>
              </button>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-2">
          <h3 className="text-base font-extrabold text-gray-800">Description</h3>
          <p className={`text-sm text-gray-500 font-medium leading-relaxed ${!isDescriptionExpanded && 'line-clamp-2'}`}>
            {mediaData.description || "No description available for this title."}
          </p>
          {mediaData.description && mediaData.description.length > 100 && (
            <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-orange-600 font-bold text-xs hover:underline pt-1 block">
              {isDescriptionExpanded ? 'Read Less ▲' : 'Read More ▼'}
            </button>
          )}
        </div>
      </div>

      {/* Cast/Crew Column */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-wider text-xs text-gray-400">
          Starring Cast Crew
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {(mediaData.cast || []).map((actor) => (
            <div key={actor._id || actor.id} className="flex items-center gap-3 p-2 bg-gray-50/50 hover:bg-orange-50/50 rounded-xl border border-gray-100 transition group cursor-pointer">
              <img src={actor.image || FALLBACK_AVATAR} alt={actor.name} className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm group-hover:border-orange-300 transition" />
              <div>
                <div className="text-sm font-bold text-gray-700 group-hover:text-orange-600 transition">{actor.name}</div>
                <div className="text-[11px] text-gray-400 font-semibold mt-0.5">Featured Talent</div>
              </div>
            </div>
          ))}

          {(!mediaData.cast || mediaData.cast.length === 0) && (
            <div className="text-xs text-gray-400 font-medium p-4 text-center">
              No verified casting logs allocated for this production.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default VideoPlayerPage;