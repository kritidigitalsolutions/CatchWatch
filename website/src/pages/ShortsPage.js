import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { FaRegHeart, FaHeart, FaPlay, FaTimes, FaTrash, FaVolumeMute, FaVolumeUp, FaThumbtack } from "react-icons/fa";
import { FaBookmark } from "react-icons/fa";
import { FaShareNodes } from "react-icons/fa6";
import { LuMessageCircleMore } from "react-icons/lu";
import Loader from '../components/Loader';
import VerifiedBadge from '../components/VerifiedBadge';
import ShareReelModal from '../components/ShareReelModal';
import { HiSpeakerphone } from "react-icons/hi";
import { MdCamera } from "react-icons/md";

// APIs Import
import API from '../api/axiosConfig';
import { getReelsFeed } from '../api/reelsApi';
import { toggleLike, toggleBookmark, getContentInteractions } from '../api/interactionApi';
import { addComment, getComments, deleteComment, pinComment } from '../api/commentApi';
import { toggleFollowUser } from '../api/userApi';

// Helper to decode JWT token to get current user ID
const getLoggedInUserId = () => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).id;
  } catch (e) {
    return null;
  }
};

// Individual Video Component
const ShortVideo = ({ video, isActive }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem("reelsMuted") === "true";
    } catch (e) {
      return false;
    }
  });
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleSound = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      try {
        localStorage.setItem("reelsMuted", nextMuted ? "true" : "false");
      } catch (err) {}
    }
  };

  // Interactive States
  const [liked, setLiked] = useState(Boolean(video.isLiked || video.userInteraction === "like"));
  const [likesCount, setLikesCount] = useState(Number(video.likesCount ?? video.likes?.length ?? 0));
  const [saved, setSaved] = useState(Boolean(video.isSaved || video.isBookmarked));
  const [isFollowing, setIsFollowing] = useState(Boolean(video.isFollowing));
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(video.commentsCount || 0);

  const authorObj = (typeof video.user === "object" && video.user) ? video.user : (video.author || {});
  const authorId = authorObj._id || authorObj.id || (typeof video.user === "string" ? video.user : null);
  const authorUsername = authorObj.username ? authorObj.username.replace(/^@/, "") : authorId;
  const loggedInUserId = getLoggedInUserId();
  const isSelf = loggedInUserId && authorId && loggedInUserId.toString() === authorId.toString();

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (authorUsername) {
      navigate(`/user/${authorUsername}`);
    } else if (authorId) {
      navigate(`/user/${authorId}`);
    }
  };

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to follow users.");
      return;
    }
    if (!authorId) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    try {
      const res = await toggleFollowUser(authorId);
      if (res && res.success) {
        setIsFollowing(res.isFollowing);
      }
    } catch (err) {
      console.error("Reel follow toggle error:", err);
      setIsFollowing(!nextState);
    }
  };

  const rawSrc = video.videoUrl || video.mediaUrl || video.url || video.video || video.streamUrl || "";

  const isImageAd = Boolean(
    video.isAd && (
      video.adType === "IMAGE" ||
      video.adType === "BANNER" ||
      video.adType === "CAROUSEL" ||
      (rawSrc && rawSrc.match(/\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i))
    )
  );

  const bunnyEmbedUrl = (() => {
    if (isImageAd) return null;
    let vId = video.videoId;
    if (!vId && rawSrc && (rawSrc.includes('b-cdn.net') || rawSrc.includes('mediadelivery.net'))) {
      const parts = rawSrc.split('/');
      const found = parts.find(p => p.length >= 32 && (p.includes('-') || p.length === 36));
      if (found && !found.includes('.')) vId = found;
    }
    if (vId) {
      return `https://iframe.mediadelivery.net/embed/711587/${vId}?autoplay=${isActive ? 'true' : 'false'}&loop=true&muted=false`;
    }
    return null;
  })();

  // Autoplay logic for standard HTML5 video elements when video comes into view
  useEffect(() => {
    if (bunnyEmbedUrl) return; // Managed via iframe autoplay parameter

    const videoElement = videoRef.current;
    if (!videoElement || !rawSrc) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = rawSrc.toLowerCase().includes(".m3u8");
    const canNativeHLS = videoElement.canPlayType('application/x-mpegURL') || videoElement.canPlayType('application/vnd.apple.mpegurl');

    const safePlay = () => {
      if (!videoElement) return;
      videoElement.muted = isMutedRef.current;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            if (err.name === "NotAllowedError" && !videoElement.muted) {
              videoElement.muted = true;
              setIsMuted(true);
              videoElement.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            } else if (err.name === "AbortError") {
              // Harmless interruption when scrolling quickly
            } else {
              console.log("Autoplay prevented:", err?.name, err?.message);
              setIsPlaying(false);
            }
          });
      }
    };

    if (isHls && Hls.isSupported() && !canNativeHLS) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(rawSrc);
      hls.attachMedia(videoElement);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isActive) safePlay();
      });
    } else {
      if (!videoElement.src || (!videoElement.src.endsWith(rawSrc) && videoElement.src !== rawSrc)) {
        videoElement.src = rawSrc;
      }
      if (isActive) {
        if (videoElement.readyState >= 2) {
          safePlay();
        } else {
          const handleCanPlay = () => {
            safePlay();
          };
          videoElement.addEventListener("canplay", handleCanPlay, { once: true });
          safePlay();
        }
      } else {
        videoElement.pause();
        videoElement.currentTime = 0;
        setIsPlaying(false);
      }
    }

    if (!isActive && videoElement) {
      videoElement.pause();
      setIsPlaying(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isActive, rawSrc, bunnyEmbedUrl]);

  // Fetch stats and interactions if active
  useEffect(() => {
    const reelId = video._id || video.id;
    if (!reelId) return;

    const fetchStats = async () => {
      try {
        const stats = await getContentInteractions(reelId);
        if (stats) {
          if (stats.userInteraction) {
            setLiked(stats.userInteraction === "like");
          }
          if (typeof stats.isBookmarked === "boolean") {
            setSaved(stats.isBookmarked);
          }
          if (typeof stats.likes === "number") {
            setLikesCount(stats.likes);
          }
        }
      } catch (e) {
        console.log("Error fetching stats for reel:", e);
      }
    };

    if (isActive) {
      fetchStats();
    }
  }, [isActive, video._id, video.id]);

  // Fetch comments when comments section is opened
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        const res = await getComments(video._id);
        setComments(res.comments || res.data || []);
        setCommentsCount(res.total || res.comments?.length || 0);
      } catch (e) {
        console.log("Error loading comments:", e);
      } finally {
        setIsLoadingComments(false);
      }
    };

    if (showComments && video._id) {
      fetchComments();
    }
  }, [showComments, video._id]);

  const handleCommentPin = async (commentId, isCurrentlyPinned, e) => {
    e.stopPropagation();
    try {
      const res = await pinComment(commentId, !isCurrentlyPinned);
      if (res && res.success) {
        setComments((prev) => {
          const updated = prev.map((item) => {
            if (item._id === commentId) {
              return { ...item, isPinned: !isCurrentlyPinned };
            }
            return { ...item, isPinned: false };
          });
          return updated.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
        });
      }
    } catch (err) {
      console.error("Pin comment failed", err);
      alert(err.response?.data?.message || "Failed to pin comment");
    }
  };

  // const handleCommentDelete = async (commentId, e) => {
  //   e.stopPropagation();
  //   if (!window.confirm("Delete this comment?")) return;
  //   try {
  //     await deleteComment(commentId);
  //     setComments((prev) => prev.filter((item) => item._id !== commentId));
  //     setCommentsCount((prev) => Math.max(0, prev - 1));
  //   } catch (err) {
  //     console.error("Delete comment failed", err);
  //   }
  // };

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
      setIsPlaying(false);
    } else {
      videoElement.muted = isMutedRef.current;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log("Play failed:", err?.name, err?.message);
            if (err.name === "NotAllowedError" && !videoElement.muted) {
              videoElement.muted = true;
              setIsMuted(true);
              videoElement.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            } else {
              setIsPlaying(false);
            }
          });
      }
    }
  };

  // Like Click Handler
  const handleLikeToggle = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to like this reel.");
      return;
    }
    const reelId = video._id || video.id;
    if (!reelId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));
    try {
      const res = await toggleLike(reelId);
      if (res && typeof res.totalLikes === "number") {
        setLikesCount(res.totalLikes);
      }
      if (res && typeof res.isLiked === "boolean") {
        setLiked(res.isLiked);
      } else if (res && res.message) {
        const isNowLiked = res.message.toLowerCase().includes("added") || (res.message.toLowerCase().includes("like") && !res.message.toLowerCase().includes("removed"));
        setLiked(isNowLiked);
      }
    } catch (err) {
      console.error("Like toggle failed", err);
      // Rollback
      setLiked(!nextLiked);
      setLikesCount(prev => !nextLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  // Save Click Handler
  const handleSaveToggle = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to save this reel.");
      return;
    }
    const reelId = video._id || video.id;
    if (!reelId) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await toggleBookmark(reelId);
    } catch (err) {
      console.error("Bookmark toggle failed", err);
      // Rollback
      setSaved(!nextSaved);
    }
  };

  // Share Click Handler
  const handleShareClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setShowShareModal(true);
  };

  // Comment Submit Handler
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to comment.");
      return;
    }
    try {
      const res = await addComment(video._id, { text: commentText });
      if (res.success && res.comment) {
        setComments(prev => [res.comment, ...prev]);
        setCommentsCount(prev => prev + 1);
        setCommentText("");
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
      alert("Failed to post comment. Please try again.");
    }
  };

  // Comment Delete Handler
  const handleCommentDelete = async (commentId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      setCommentsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment.");
    }
  };

  return (
    <div className="w-full h-full snap-start relative bg-zinc-950 flex-shrink-0">

      {/* Sponsored Ad Badge */}
      {video.isAd && (
        <div className="absolute top-4 left-4 z-30 bg-gradient-to-r from-amber-500 to-orange-500 text-black px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xl flex items-center gap-1.5 border border-amber-300/40">
          <span className="flex items-center gap-1"><HiSpeakerphone /> <p>Sponsored Ad</p></span>
        </div>
      )}

      {/* Media Element: Image Ad vs Video Ad */}
      {isImageAd ? (
        <div className="w-full h-full relative flex items-center justify-center bg-black">
          <img
            src={rawSrc || video.thumbnailUrl || video.thumbnail}
            alt={video.title || video.caption || "Sponsored Ad"}
            className="w-full h-full object-cover"
          />
        </div>
      ) : bunnyEmbedUrl ? (
        <iframe
          src={bunnyEmbedUrl}
          title="Reel Video"
          className="w-full h-full border-0 object-cover"
          allow="autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        ></iframe>
      ) : (
        <video
          ref={videoRef}
          src={rawSrc.toLowerCase().includes(".m3u8") && Hls.isSupported() ? undefined : (rawSrc || undefined)}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          muted={isMuted}
          preload="metadata"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Mute/Unmute Audio Button */}
      {!isImageAd && !bunnyEmbedUrl && (
        <button
          onClick={toggleSound}
          className="absolute top-16 right-4 z-30 bg-black/60 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-black/80 transition shadow-lg"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
        </button>
      )}

      {/* Play Icon Overlay (Visible when paused manually) */}
      {!isImageAd && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center text-white text-2xl backdrop-blur-sm pl-1">
            <FaPlay />
          </div>
        </div>
      )}

      {/* Floating System Actions Widget Stack */}
      <div className="absolute bottom-16 sm:bottom-20 md:bottom-24 right-2 sm:right-3 md:right-4 flex flex-col gap-2.5 sm:gap-3.5 md:gap-5 items-center z-20 text-white">
        {/* Like Button */}
        <button onClick={handleLikeToggle} className="flex flex-col items-center group">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl hover:bg-white/20 transition ${liked ? 'text-red-500 scale-110' : ''}`}>
            {liked ? <FaHeart /> : <FaRegHeart />}
          </div>
          <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1 shadow-sm">
            {likesCount}
          </span>
        </button>

        {/* Comment Button */}
        <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl group-hover:bg-white/20 transition">
            <LuMessageCircleMore />
          </div>
          <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1 shadow-sm">
            {commentsCount}
          </span>
        </button>

        {/* Save Button */}
        <button onClick={handleSaveToggle} className="flex flex-col items-center group">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl hover:bg-white/20 transition ${saved ? 'text-orange-500 scale-110' : ''}`}>
            <FaBookmark />
          </div>
          <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wide mt-0.5 ${saved ? 'text-orange-400' : ''}`}>
            {saved ? 'Saved' : 'Save'}
          </span>
        </button>

        {/* Share Button */}
        <button onClick={handleShareClick} className="flex flex-col items-center group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl group-hover:bg-white/20 transition">
            <FaShareNodes />
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wide mt-0.5">Share</span>
        </button>
      </div>

      {/* Bottom User Description Meta Interface */}
      <div className="absolute bottom-2 sm:bottom-3 md:bottom-5 left-2 sm:left-3 md:left-4 right-14 sm:right-16 md:right-20 z-20 text-white bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2 sm:p-2.5 md:p-3 rounded-xl backdrop-blur-[2px] border border-white/5 max-h-[45%] overflow-hidden">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          {/* Author Avatar, Name & Username - Clickable */}
          <div
            onClick={handleProfileClick}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-1 min-w-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-brand-orange flex items-center justify-center font-bold text-xs sm:text-sm border-2 border-white/70 overflow-hidden flex-shrink-0 group-hover:scale-105 transition">
              {authorObj.profileImage || video.authorImage || video.channelImage ? (
                <img
                  src={authorObj.profileImage || video.authorImage || video.channelImage}
                  alt="author"
                  className="w-full h-full object-cover"
                />
              ) : (
                authorObj.name ? authorObj.name.charAt(0).toUpperCase() : "CW"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold tracking-wide text-xs sm:text-sm md:text-base line-clamp-1 group-hover:text-brand-orange transition flex items-center gap-1">
                <span>{authorObj.name || video.authorName || "User"}</span>
                <VerifiedBadge user={authorObj} size="sm" />
              </h4>
              <p className="text-[10px] sm:text-xs font-bold text-gray-300 line-clamp-1 group-hover:underline">
                {authorObj.username ? (authorObj.username.startsWith("@") ? authorObj.username : `@${authorObj.username}`) : "@user"}
              </p>
            </div>
          </div>

          {/* Follow / Unfollow Button */}
          {!isSelf && authorId && (
            <button
              onClick={handleFollowToggle}
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-extrabold transition shadow flex-shrink-0 ${
                isFollowing
                  ? "bg-white/20 text-white border border-white/30 hover:bg-red-500/80 hover:border-red-500"
                  : "bg-brand-orange text-white hover:bg-orange-600"
              }`}
            >
              {isFollowing ? "Following" : "+ Follow"}
            </button>
          )}
        </div>
        <p className="text-[11px] sm:text-xs md:text-sm text-gray-200 font-medium mb-1 sm:mb-2 line-clamp-2">
          {video.description || video.caption || "Enjoy this reel exclusively on CatchWatch."}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          {/* <span><FaItunesNote /></span>
          <span className="truncate bg-white/10 px-2 py-0.5 rounded text-[11px]">
            {video.isAd ? "Sponsored Ad Creative" : "Original Audio - CatchWatch Music"}
          </span> */}
        </div>

        {/* Sponsored Ad Call To Action Button */}
        {video.isAd && (
          <a
            href={video.destinationUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 w-full py-2.5 bg-gradient-to-r from-brand-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-xl flex items-center justify-center gap-2 tracking-wide cursor-pointer text-center"
          >
            <span>{video.ctaText || "Learn More"}</span>
            <span>→</span>
          </a>
        )}
      </div>

      {/* Comments Slide-Up Bottom Drawer overlay */}
      {showComments && (
        <div className="absolute inset-0 bg-black/60 z-30 flex flex-col justify-end" onClick={() => setShowComments(false)}>
          <div
            className="w-full bg-zinc-900 border-t border-white/10 rounded-t-2xl max-h-[60%] flex flex-col p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
              <span className="font-extrabold text-sm sm:text-base">Comments ({commentsCount})</span>
              <button
                onClick={() => setShowComments(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingComments ? (
                <div className="text-center py-6 text-zinc-400 text-xs font-semibold">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs font-bold">No comments yet. Start the conversation!</div>
              ) : (
                comments.map((c) => {
                  const isOwnComment = c.user?._id === getLoggedInUserId();
                  const isVerifiedUser = c.user?.verification?.isVerified || c.user?.verification?.status === "VERIFIED";
                  const isReelCreator = Boolean(
                    video?.user?._id === getLoggedInUserId() ||
                    video?.user === getLoggedInUserId() ||
                    video?.authorId === getLoggedInUserId() ||
                    isSelf
                  );

                  const isVerifiedCreator = isReelCreator && (
                    Boolean(authorObj?.orangeTick || authorObj?.blueTick || authorObj?.isVerified || authorObj?.verification?.isVerified || authorObj?.verification?.status === "VERIFIED" || authorObj?.verification?.status === "APPROVED") ||
                    (() => {
                      try {
                        const u = JSON.parse(localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}");
                        return Boolean(u?.orangeTick || u?.blueTick || u?.isVerified || u?.verification?.isVerified || u?.verification?.status === "VERIFIED" || u?.verification?.status === "APPROVED");
                      } catch (e) { return false; }
                    })()
                  );

                  return (
                    <div
                      key={c._id}
                      className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border transition ${
                        c.isPinned
                          ? "bg-amber-950/40 border-amber-500/50 shadow-sm"
                          : isVerifiedUser
                          ? "bg-orange-950/40 border-orange-500/40 shadow-sm"
                          : "bg-white/5 border-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {c.user?.profileImage ? (
                            <img src={c.user.profileImage} alt="user" className="w-full h-full object-cover" />
                          ) : (
                            (c.user?.name || "U")[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Pinned Tag */}
                          {c.isPinned && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full w-fit mb-1">
                              <FaThumbtack className="text-amber-400 text-[9px]" />
                              <span>Pinned by Creator</span>
                            </div>
                          )}
                          <div className="text-xs font-black text-orange-400 truncate flex items-center gap-1">
                            <span>{c.user?.name || c.user?.username || "Anonymous"}</span>
                            <VerifiedBadge user={c.user} size="sm" />
                          </div>
                          <div className="text-[12px] text-zinc-200 mt-0.5 break-words font-medium leading-relaxed">
                            {c.text}
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-1 font-semibold">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Pin Button ONLY for Verified Orange Tick Reel Creator */}
                        {isVerifiedCreator && (
                          <button
                            onClick={(e) => handleCommentPin(c._id, c.isPinned, e)}
                            className={`p-1.5 rounded transition text-[11px] flex items-center justify-center ${
                              c.isPinned
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                : "bg-white/5 text-zinc-400 hover:text-amber-400 hover:bg-white/10"
                            }`}
                            title={c.isPinned ? "Unpin Comment" : "Pin Comment to Top"}
                          >
                            <FaThumbtack className={c.isPinned ? "text-amber-400" : "rotate-45"} />
                          </button>
                        )}

                        {isOwnComment && (
                          <button
                            onClick={(e) => handleCommentDelete(c._id, e)}
                            className="text-zinc-500 hover:text-red-500 transition text-[11px] p-1.5 bg-white/5 hover:bg-red-500/10 rounded"
                            title="Delete Comment"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2 pt-3 border-t border-white/10">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-orange"
              />
              <button
                type="submit"
                className="bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Reel Modal */}
      <ShareReelModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        reel={video}
      />

    </div>
  );
};

// Ad Video / Card Component
const AdVideo = ({ ad, isActive }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);

  const mediaSrc = ad.mediaUrl || ad.videoUrl || ad.url || "";
  const isImageMedia = Boolean(
    ad.adType === "IMAGE" ||
    ad.adType === "BANNER" ||
    ad.adType === "CAROUSEL" ||
    (mediaSrc && mediaSrc.match(/\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i))
  );

  useEffect(() => {
    if (isActive) {
      // Record Ad Impression safely
      const rawAdId = ad.adId || ad._id;
      API.post("/ads/event", {
        adId: rawAdId,
        campaignId: ad.campaignId,
        eventType: "IMPRESSION",
      }).catch(() => {});
    }
  }, [isActive, ad]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (isImageMedia) return;
    const videoElement = videoRef.current;
    if (!videoElement || !mediaSrc) return;

    if (isActive) {
      videoElement.muted = isMutedRef.current;
      videoElement.currentTime = 0;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .catch((err) => {
            console.log("Ad video autoplay attempt muted fallback:", err);
            videoElement.muted = true;
            setIsMuted(true);
            videoElement.play().catch(() => {});
          });
      }
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }, [isActive, mediaSrc, isImageMedia]);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleCtaClick = () => {
    const rawAdId = ad.adId || ad._id;
    API.post("/ads/event", {
      adId: rawAdId,
      campaignId: ad.campaignId,
      eventType: "CLICK",
    }).catch(() => {});
    if (ad.destinationUrl && ad.destinationUrl !== "#") {
      window.open(ad.destinationUrl, "_blank");
    }
  };

  return (
    <div className="w-full h-full snap-start relative bg-zinc-950 flex flex-col justify-between overflow-hidden">
      {/* Sponsored Badge */}
      <div className="absolute top-16 left-4 z-20 bg-amber-500/90 text-black text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
        <span className="flex items-center gap-1 w-full flex-row"><HiSpeakerphone /> <p>Sponsored Ad</p></span>
      </div>

      {/* Mute/Unmute Audio Button for Video Ads */}
      {!isImageMedia && (
        <button
          onClick={toggleSound}
          className="absolute top-16 right-4 z-20 bg-black/60 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-black/80 transition"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
        </button>
      )}

      {/* Ad Media */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
        {isImageMedia ? (
          <img
            src={mediaSrc || ad.thumbnailUrl}
            alt={ad.title || "Sponsored Ad"}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            src={mediaSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => {
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play();
                } else {
                  videoRef.current.pause();
                }
              }
            }}
          />
        )}
      </div>

      {/* Overlay Details & CTA */}
      <div className="absolute bottom-6 left-4 right-4 z-20 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col gap-3">
        <div>
          <h3 className="text-white font-bold text-base">{ad.title || "Sponsored Offer"}</h3>
          <p className="text-zinc-300 text-xs mt-1">Check out this special recommendation</p>
        </div>
        <button
          onClick={handleCtaClick}
          className="w-full bg-gradient-to-r from-brand-orange to-orange-600 hover:opacity-95 text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95 text-sm tracking-wide"
        >
          {ad.ctaText || "Learn More"} →
        </button>
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
        const response = await getReelsFeed({ limit: 50 });
        const rawData = response?.reels || response?.data || response || [];
        setReels(Array.isArray(rawData) ? rawData : []);
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

    if (currentReel && !currentReel.isAd && currentReel.isPremium) {
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
    const newActiveIndex = Math.round(scrollPosition / containerHeight);

    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);
    }
  };

  if (isLoading) return <Loader />;

  if (error || reels.length === 0) {
    return (
      <div className="mx-auto w-auto max-w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] h-[calc(100dvh-136px)] max-h-[calc(100dvh-136px)] md:h-[calc(100vh-120px)] md:max-h-[780px] my-auto flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-lg sm:text-xl font-bold">Oops!</h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-2 text-center">{error || "No reels available right now."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-auto max-w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] h-[calc(100dvh-136px)] max-h-[calc(100dvh-136px)] md:h-[calc(100vh-120px)] md:max-h-[780px] my-auto">

      {/* Absolute Transparent Frame Header */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-40 text-white">
        <h1 className="text-base sm:text-xl font-black tracking-wide drop-shadow-md">Reels</h1>
        <button
          onClick={() => navigate('/upload')}
          className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition active:scale-95"
          title="Upload Reel"
        >
          <MdCamera className="text-sm sm:text-base" />
          <span>Upload Reel</span>
        </button>
      </div>

      {/* Scrollable Video Feed Container */}
      <div
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        onScroll={handleScroll}
      >
        {reels.map((video, index) => (
          video.isAd ? (
            <AdVideo key={video._id || index} ad={video} isActive={index === activeIndex} />
          ) : (
            <ShortVideo
              key={video._id || video.id || index}
              video={video}
              isActive={index === activeIndex}
            />
          )
        ))}
      </div>
    </div>
  );
};

export default ShortsPage;