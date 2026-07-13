import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { MdDownloadForOffline } from "react-icons/md";
import {
  FaPlay, FaPause, FaExpand, FaCompress,
  FaVolumeUp, FaVolumeMute, FaCog,
  FaRegBookmark, FaBookmark
} from "react-icons/fa";

// APIs Import
import { getMovieBySlug } from '../api/movieApi';
import { getShortFilmsBySlug } from '../api/shortApi';
import { getEpisodeById } from '../api/episodesApi'; 
import { getUserProfile } from '../api/userApi';
import { toggleBookmark, getContentInteractions } from '../api/interactionApi';
import Loader from '../components/Loader';
import { TbRewindBackward10, TbRewindForward10 } from "react-icons/tb";

// Helper to resolve video URLs (resolves relative paths to backend base URL in dev)
const resolveVideoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${apiBase}${cleanUrl}`;
};

const getVideoSrcForQuality = (url, quality) => {
  if (!url) return null;
  
  // Detect if this is a Bunny Stream URL (contains playlist.m3u8)
  const isBunnyStream = url.toLowerCase().includes("playlist.m3u8");
  
  if (isBunnyStream) {
    const base = url.substring(0, url.toLowerCase().lastIndexOf('/'));
    
    // If Hls.js or native HLS is supported, play HLS directly!
    const videoEl = document.createElement('video');
    const canPlayHLS = videoEl.canPlayType('application/x-mpegURL') || 
                       videoEl.canPlayType('application/vnd.apple.mpegurl');
    if (canPlayHLS || Hls.isSupported()) {
      return url;
    }

    if (!quality || quality === "Auto") {
      // Otherwise, fallback to a default quality for Auto on non-HLS browsers
      return `${base}/play_720p.mp4`;
    }
    
    // Manual quality (e.g. 1080p, 720p, etc.)
    return `${base}/play_${quality}.mp4`;
  }
  
  // Standard Bunny Storage static file fallback logic
  if (!quality || quality === "Auto") return url;
  
  const lastDotIndex = url.lastIndexOf('.');
  if (lastDotIndex === -1) return url;
  
  const base = url.substring(0, lastDotIndex);
  const ext = url.substring(lastDotIndex);
  
  return `${base}-${quality}${ext}`;
};

// Supported resolutions in preferred descending order
const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "240p", "Auto"];

// Estimate user connection speed in Mbps using the Network Information API
const estimateInternetSpeed = () => {
  if (navigator.connection && typeof navigator.connection.downlink === 'number') {
    return navigator.connection.downlink;
  }
  return 3.0; // Default fallback to 3 Mbps
};

// Map internet speed to target quality
const getQualityForSpeed = (speedMbps) => {
  if (speedMbps >= 6.0) return "1080p";
  if (speedMbps >= 3.0) return "720p";
  if (speedMbps >= 1.5) return "480p";
  if (speedMbps >= 0.8) return "360p";
  return "240p";
};

const VideoPlayerPage = () => {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const fallbackQueueRef = useRef([]);
  const lastSwitchTimeRef = useRef(0);
  const hlsRef = useRef(null);



  const [mediaData, setMediaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoLoadError, setVideoLoadError] = useState(false);
  
  // Interaction States
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Player States
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
  const [selectedQuality, setSelectedQuality] = useState("Auto");
  const [activeQuality, setActiveQuality] = useState("Auto");
  const [videoSrc, setVideoSrc] = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
          try {
            response = await getMovieBySlug(slug);
            data = response?.movie || response;
          } catch (err) {
            console.log("Not a movie, trying short film:", err);
          }
          if (!data) {
            try {
              response = await getShortFilmsBySlug(slug);
              data = response?.shortFilm || response;
            } catch (err) {
              console.error("Short film fetch also failed:", err);
            }
          }
        } else if (id) {
          response = await getEpisodeById(id);
          data = response?.episode || response?.data || response;
        }

        if (data) {
          if (data.isPremium) {
            let isUserPremium = localStorage.getItem("userIsPremium") === "true";
            if (!isUserPremium) {
              try {
                const profileRes = await getUserProfile();
                const user = profileRes?.user || profileRes?.data || profileRes;
                isUserPremium = !!(user?.isPremium || user?.planId);
              } catch (profileErr) {
                console.error("Error verifying premium status:", profileErr);
              }
            }

            if (!isUserPremium) {
              alert("Premium membership subscription required to play this title.");
              navigate('/subscription');
              return;
            }
          }
          
          setMediaData(data);
          
          // --- FETCH INITIAL WISHLIST STATUS ---
          const contentId = data._id || data.id;
          const token = localStorage.getItem("authToken") || localStorage.getItem("token");
          if (contentId && token) {
            try {
              const statsRes = await getContentInteractions(contentId);
              if (statsRes && statsRes.isBookmarked) {
                setIsWishlisted(true);
              }
            } catch (e) {
              console.log("Could not fetch interaction stats", e);
            }
          }

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
  }, [slug, id, navigate]);

  // Initialize video source once mediaData is loaded
  useEffect(() => {
    if (mediaData?.videoUrl) {
      changeQuality("Auto", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaData]);

  // --- DOWNLOAD LOGIC ---
  const handleDownload = () => {
    if (!mediaData || !mediaData.videoUrl) {
      alert("Video URL not available for download.");
      return;
    }

    setIsDownloading(true);

    try {
      const downloadItem = {
        id: mediaData._id || mediaData.id || new Date().getTime(),
        slug: mediaData.slug,
        title: mediaData.title,
        videoUrl: mediaData.videoUrl,
        thumbnail: mediaData.thumbnail || mediaData.poster || FALLBACK_AVATAR,
        duration: mediaData.duration,
        downloadedAt: new Date().toISOString()
      };

      const existingDownloads = JSON.parse(localStorage.getItem('offlineDownloads') || '[]');
      
      if (!existingDownloads.some(item => item.id === downloadItem.id)) {
        localStorage.setItem('offlineDownloads', JSON.stringify([downloadItem, ...existingDownloads]));
      }

      // Trigger download
      const a = document.createElement('a');
      a.href = mediaData.videoUrl;
      a.download = `${mediaData.title.replace(/\s+/g, '_')}.mp4`; 
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      alert("Download initiated! You can view this file in your Offline Vault.");
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to initiate download.");
    } finally {
      setIsDownloading(false);
    }
  };

  // --- WISHLIST / BOOKMARK LOGIC ---
  const handleWishlistToggle = async () => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to add videos to your wishlist.");
      navigate('/login');
      return;
    }
    
    const contentId = mediaData?._id || mediaData?.id;
    if (!contentId) return;

    // Optimistic UI Update (Immediate feedback)
    setIsWishlisted(!isWishlisted);
    
    try {
      await toggleBookmark(contentId);
    } catch (err) {
      console.error("Bookmark toggle failed:", err);
      // Rollback UI if the API call fails
      setIsWishlisted(!isWishlisted); 
      alert("Failed to update wishlist. Please try again.");
    }
  };

  // --- PLAYER CONTROLS ---
  const togglePlay = () => {
    if (!videoRef.current || !mediaData?.videoUrl) return;
    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(error => console.error("Playback blocked:", error));
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '00:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    if (isFinite(current) && isFinite(total) && total > 0) {
      setProgress((current / total) * 100);
      setCurrentTime(formatTime(current));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoLoadError(false); // Reset error status on successful metadata load
      const durationVal = videoRef.current.duration;
      if (isFinite(durationVal)) {
        setDuration(formatTime(durationVal));
      }
      
      // Safe time restoration after quality switch
      if (pendingSeekRef.current !== null && isFinite(pendingSeekRef.current) && pendingSeekRef.current > 0) {
        videoRef.current.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }

      // Resume playback if it was playing before quality change
      if (wasPlayingRef.current) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Auto-play after quality change failed:", e));
        wasPlayingRef.current = false;
      }

      setIsBuffering(false);
    }
  };

  const handleScrub = (clientX, progressBar) => {
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = clientX - rect.left;
    const totalWidth = rect.width;
    if (videoRef.current) {
      const durationVal = videoRef.current.duration;
      if (isFinite(durationVal) && durationVal > 0) {
        let pct = clickPosition / totalWidth;
        pct = Math.max(0, Math.min(1, pct));
        const newTime = pct * durationVal;
        if (isFinite(newTime)) {
          videoRef.current.currentTime = newTime;
          setProgress(pct * 100);
          setCurrentTime(formatTime(newTime));
        }
      }
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleScrub(e.clientX, e.currentTarget);
  };

  const handleGlobalMouseMove = (e) => {
    if (!isDragging) return;
    const progressBar = document.getElementById("progress-bar-slider");
    if (progressBar) {
      handleScrub(e.clientX, progressBar);
    }
  };

  const handleGlobalMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    } else {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    setVolume(!isMuted ? 0 : 1);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackSpeed = (speed) => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const seekBackward = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      if (isFinite(current)) {
        videoRef.current.currentTime = Math.max(0, current - 10);
      }
    }
  };

  const seekForward = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      if (isFinite(current) && isFinite(total)) {
        videoRef.current.currentTime = Math.min(total, current + 10);
      }
    }
  };

  const changeQuality = (quality, preserveTime = true) => {
    if (!mediaData?.videoUrl) return;

    const savedTime = videoRef.current ? videoRef.current.currentTime : 0;
    const wasPlaying = videoRef.current ? !videoRef.current.paused : false;

    pendingSeekRef.current = preserveTime && isFinite(savedTime) && savedTime > 0 ? savedTime : null;
    wasPlayingRef.current = wasPlaying;
    setVideoLoadError(false);
    setIsBuffering(true);

    let targetQuality = quality;
    if (quality === "Auto") {
      const isBunnyStream = mediaData.videoUrl.toLowerCase().includes("playlist.m3u8");
      const videoEl = document.createElement('video');
      const canPlayHLS = videoEl.canPlayType('application/x-mpegURL') || 
                         videoEl.canPlayType('application/vnd.apple.mpegurl');
      
      if (isBunnyStream && (Hls.isSupported() || canPlayHLS)) {
        targetQuality = "Auto";
      } else {
        const speed = estimateInternetSpeed();
        targetQuality = getQualityForSpeed(speed);
        console.log(`Auto mode: estimated speed ${speed} Mbps, selecting target quality ${targetQuality}`);
      }
    }

    setSelectedQuality(quality);
    setActiveQuality(targetQuality);

    if (targetQuality !== "Auto") {
      const targetIndex = QUALITY_ORDER.indexOf(targetQuality);
      let queue = [];
      if (targetIndex !== -1) {
        queue = QUALITY_ORDER.slice(targetIndex + 1);
      }
      if (!queue.includes("Auto")) {
        queue.push("Auto");
      }
      fallbackQueueRef.current = queue;
    } else {
      fallbackQueueRef.current = [];
    }

    // Resolve and set video source
    let newSrc = resolveVideoUrl(getVideoSrcForQuality(mediaData.videoUrl, targetQuality));
    if (newSrc && newSrc.includes(".m3u8")) {
      newSrc = `${newSrc}${newSrc.includes("?") ? "&" : "?"}quality=${quality}`;
    }
    setVideoSrc(newSrc);
  };

  const handleVideoError = () => {
    if (videoRef.current && videoRef.current.error) {
      const code = videoRef.current.error.code;
      // Code 1 is aborted (MEDIA_ERR_ABORTED), normal when switching sources.
      if (code > 1) {
        console.warn(`Video playback error code ${code} for source ${videoSrc} (active quality: ${activeQuality})`);

        if (fallbackQueueRef.current && fallbackQueueRef.current.length > 0) {
          const nextQuality = fallbackQueueRef.current.shift();
          console.log(`Falling back to next quality: ${nextQuality}`);
          
          setActiveQuality(nextQuality);
          const nextSrc = resolveVideoUrl(getVideoSrcForQuality(mediaData.videoUrl, nextQuality));
          setVideoSrc(nextSrc);
          return;
        }

        setVideoLoadError(true);
        setIsBuffering(false);
      }
    }
  };

  // HLS.js Player Lifecycle Management
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;

    const isM3U8 = videoSrc.toLowerCase().includes("playlist.m3u8");

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isM3U8) {
      const videoEl = videoRef.current;
      const canPlayHLS = videoEl.canPlayType('application/x-mpegURL') || 
                         videoEl.canPlayType('application/vnd.apple.mpegurl');

      if (Hls.isSupported()) {
        console.log("HLS.js supported. Initializing Hls instance...");
        const hls = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
        });
        hls.loadSource(videoSrc);
        hls.attachMedia(videoEl);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log("HLS manifest parsed. Levels found:", data.levels.map(l => l.height));
          
          // Apply manual quality if not "Auto"
          if (selectedQuality && selectedQuality !== "Auto") {
            const targetHeight = parseInt(selectedQuality);
            const targetIndex = data.levels.findIndex(l => l.height === targetHeight);
            if (targetIndex !== -1) {
              hls.currentLevel = targetIndex;
            }
          }
          
          // Seek to pending position if any
          if (pendingSeekRef.current !== null && isFinite(pendingSeekRef.current) && pendingSeekRef.current > 0) {
            videoEl.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          }

          // Auto-resume playback if was playing
          if (wasPlayingRef.current) {
            videoEl.play()
              .then(() => setIsPlaying(true))
              .catch(err => console.error("HLS.js auto-play failed:", err));
            wasPlayingRef.current = false;
          }
          
          setIsBuffering(false);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("HLS fatal network error, trying to recover...", data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("HLS fatal media error, trying to recover...", data);
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS unrecoverable fatal error:", data);
                handleVideoError();
                break;
            }
          }
        });
      } else if (canPlayHLS) {
        console.log("Native HLS supported. Loading directly...");
        videoEl.src = videoSrc;
      } else {
        console.warn("HLS.js and native HLS not supported. Playing standard MP4...");
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc]);

  // Dynamic quality switching for Hls.js without reloading source
  useEffect(() => {
    if (hlsRef.current && hlsRef.current.levels) {
      if (selectedQuality === "Auto") {
        hlsRef.current.currentLevel = -1; // Auto select level in Hls.js
      } else {
        const targetHeight = parseInt(selectedQuality);
        const targetIndex = hlsRef.current.levels.findIndex(l => l.height === targetHeight);
        if (targetIndex !== -1) {
          hlsRef.current.currentLevel = targetIndex;
        }
      }
    }
  }, [selectedQuality]);

  const handleWaiting = () => {
    setIsBuffering(true);
    
    // Auto-downgrade quality if buffering occurs in Auto mode
    if (selectedQuality === "Auto" && videoRef.current) {
      const now = Date.now();
      // Throttle changes to at most once per 10 seconds
      if (now - lastSwitchTimeRef.current > 10000) {
        const currentIndex = QUALITY_ORDER.indexOf(activeQuality);
        // Can downgrade if we aren't at the lowest quality (240p is index 4)
        if (currentIndex !== -1 && currentIndex < 4) {
          const nextQuality = QUALITY_ORDER[currentIndex + 1];
          console.warn(`Buffering detected in Auto mode. Downgrading quality from ${activeQuality} to ${nextQuality}`);
          
          lastSwitchTimeRef.current = now;
          const savedTime = videoRef.current.currentTime;
          pendingSeekRef.current = isFinite(savedTime) ? savedTime : null;
          wasPlayingRef.current = true;
          
          setActiveQuality(nextQuality);
          const nextSrc = resolveVideoUrl(getVideoSrcForQuality(mediaData.videoUrl, nextQuality));
          setVideoSrc(nextSrc);
        }
      }
    }
  };

  const handlePlaying = () => {
    setIsBuffering(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    if (isPlaying) {
      controlsTimeout = setTimeout(() => setShowControls(false), 2500);
    }
  };

  const isComingSoon =
    mediaData?.isComingSoon === true || mediaData?.isComingSoon === "true";

  if (isLoading) return <Loader />;

  if (isComingSoon) {
    return (
      <div className="max-w-md mx-auto w-full py-20 px-6 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-5xl shadow-sm animate-bounce">
          🎬
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Coming Soon!</h2>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed font-medium">
            This content is currently being prepared or is scheduled for release. Please check back shortly once it is ready! 🚀
          </p>
        </div>
        {mediaData?.title && (
          <div className="bg-amber-50 border border-amber-200/50 rounded-2xl px-6 py-3 text-sm font-bold text-amber-800 shadow-sm">
            Title: {mediaData.title}
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs px-8 py-3.5 rounded-xl transition shadow-md transform active:scale-95 hover:shadow-orange-500/20"
        >
          Go Back
        </button>
      </div>
    );
  }

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

  // Safe image formatting (Prevents "empty string" warning)
  const validCastImage = (img) => (img && img.trim() !== "") ? img : FALLBACK_AVATAR;

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
            src={hlsRef.current ? undefined : (videoSrc || undefined)}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={handleVideoError}
            onLoadedData={() => setVideoLoadError(false)}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
          />

          <div 
            className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start pointer-events-none"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFullscreen) {
                    document.exitFullscreen();
                  } else {
                    navigate(-1);
                  }
                }} 
                className="text-white hover:text-orange-500 transition text-2xl drop-shadow-md pointer-events-auto"
              >
                ←
              </button>
              <div className="text-white font-bold truncate max-w-sm drop-shadow-md">
                {mediaData.title} {mediaData.episodeNumber ? `(Ep ${mediaData.episodeNumber})` : ''}
              </div>
            </div>

            {/* Central Controls Cluster */}
            <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  seekBackward();
                }}
                className="w-14 h-14 bg-black/60 hover:bg-orange-600/95 text-white rounded-full flex items-center justify-center text-2xl shadow-xl transition-all hover:scale-110 pointer-events-auto backdrop-blur-sm"
                title="Rewind 10s"
              >
                <TbRewindBackward10 />
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-20 h-20 bg-orange-600/90 hover:bg-orange-600 text-white rounded-full flex items-center justify-center text-3xl shadow-xl shadow-orange-900/50 transition-all hover:scale-110 pointer-events-auto backdrop-blur-sm"
                title={isPlaying ? "Pause" : "Play"}
                style={{ paddingLeft: isPlaying ? "0px" : "4px" }}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  seekForward();
                }}
                className="w-14 h-14 bg-black/60 hover:bg-orange-600/95 text-white rounded-full flex items-center justify-center text-2xl shadow-xl transition-all hover:scale-110 pointer-events-auto backdrop-blur-sm"
                title="Forward 10s"
              >
                <TbRewindForward10 />
              </button>
            </div>

            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-10 mt-auto pointer-events-auto"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white text-xs font-semibold w-10">{currentTime}</span>
                <div 
                  id="progress-bar-slider"
                  className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative group/scrub" 
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute top-0 left-0 h-full bg-orange-600 rounded-full relative" style={{ width: `${progress}%` }}>
                    <div className="absolute right-[-6px] top-[-4px] w-3.5 h-3.5 bg-white rounded-full shadow scale-100 group-hover/scrub:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="text-white text-xs font-semibold w-10">{duration}</span>
              </div>
 
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-5">
                  <button 
                    onClick={seekBackward}
                    className="hover:text-orange-500 transition"
                    title="Skip 10s Backward"
                  >
                    {/* <FaStepBackward /> */}
                    <TbRewindBackward10 />

                  </button>
                  <button onClick={togglePlay} className="text-xl hover:text-orange-500 transition w-5 flex justify-center">
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                  <button 
                    onClick={seekForward}
                    className="hover:text-orange-500 transition"
                    title="Skip 10s Forward"
                  >
                    {/* <FaStepForward /> */}
<TbRewindForward10 />
                  </button>

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
                    <button 
                      onClick={() => {
                        setShowSpeedMenu(!showSpeedMenu);
                        setShowQualityMenu(false);
                      }} 
                      className="hover:text-orange-500 transition flex items-center gap-1"
                    >
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
                  
                  {/* Quality Settings */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowQualityMenu(!showQualityMenu);
                        setShowSpeedMenu(false);
                      }}
                      className="text-xs font-bold border border-white/30 px-1.5 py-0.5 rounded hover:border-orange-500 hover:text-orange-500 transition uppercase"
                    >
                      {selectedQuality === "Auto" ? `Auto (${activeQuality})` : selectedQuality}
                    </button>
                    {showQualityMenu && (
                      <div className="absolute bottom-8 right-0 bg-neutral-900/95 border border-white/10 rounded-lg py-2 flex flex-col w-28 backdrop-blur-md z-20 shadow-xl">
                        {["Auto", "1080p", "720p", "480p", "360p", "240p"].map(quality => (
                          <button
                            key={quality}
                            onClick={() => {
                              changeQuality(quality);
                              setShowQualityMenu(false);
                            }}
                            className={`text-xs text-left px-4 py-1.5 hover:bg-white/10 flex items-center justify-between ${selectedQuality === quality ? 'text-orange-500 font-bold' : 'text-gray-300'}`}
                          >
                            <span>{quality}</span>
                            {selectedQuality === quality && <span className="text-[10px]">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={toggleFullscreen} className="hover:text-orange-500 transition text-lg">
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Buffering/Loading Overlay */}
          {isBuffering && (
            <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-brand-orange rounded-full animate-spin"></div>
              <span className="text-white text-xs font-bold tracking-wide">Switching to {selectedQuality === "Auto" ? `Auto (${activeQuality})` : selectedQuality}...</span>
            </div>
          )}

          {/* Playback Error Overlay */}
          {videoLoadError && (
            <div className="absolute inset-0 bg-neutral-950/95 z-30 flex flex-col items-center justify-center p-6 text-center gap-4">
              <span className="text-orange-500 text-4xl">⚠️</span>
              <h3 className="text-white text-base font-bold">Playback Error</h3>
              <p className="text-gray-400 text-xs max-w-md">
                The video stream could not be loaded. This might be due to an invalid URL, a missing file on the server, or an unsupported file format.
              </p>
              {mediaData.videoUrl && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-gray-300 font-mono select-text max-w-sm truncate">
                  Source: {mediaData.videoUrl}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title Block & Actions */}
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
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-200/60 rounded-xl py-2 px-4 transition text-gray-500 font-bold text-xs gap-1 disabled:opacity-50"
              >
                <span className="text-base">
                  {isDownloading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div> : <MdDownloadForOffline />}
                </span>
                <span>{isDownloading ? 'Saving...' : 'Download'}</span>
              </button>
              <button 
                onClick={handleWishlistToggle} 
                className={`flex-1 sm:flex-none flex flex-col items-center justify-center border rounded-xl py-2 px-4 transition font-bold text-xs gap-1 ${isWishlisted ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
              >
                <span className="text-base">{isWishlisted ? <FaBookmark />  : <FaRegBookmark />}</span>
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
              <img src={validCastImage(actor.image)} alt={actor.name} className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm group-hover:border-orange-300 transition" />
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