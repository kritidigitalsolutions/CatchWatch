import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegHeart, FaHeart, FaItunesNote, FaPlay, FaTimes, FaTrash } from "react-icons/fa";
import { GiSaveArrow } from "react-icons/gi";
import { FaShareNodes } from "react-icons/fa6";
import { LuMessageCircleMore } from "react-icons/lu";
import Loader from '../components/Loader';

// APIs Import
import { getReelsFeed, incrementShares } from '../api/reelsApi';
import { toggleLike, toggleBookmark, getContentInteractions } from '../api/interactionApi';
import { addComment, getComments, deleteComment } from '../api/commentApi';

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
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Interactive States
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likesCount || video.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(video.commentsCount || 0);

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

  // Fetch stats and interactions if active
  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (!token) return;
      try {
        const stats = await getContentInteractions(video._id);
        setLiked(stats.userInteraction === "like");
        setSaved(stats.isBookmarked);
        setLikesCount(stats.likes || 0);
      } catch (e) {
        console.log("Error fetching stats for reel:", e);
      }
    };
    if (isActive && video._id) {
      fetchStats();
    }
  }, [isActive, video._id]);

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

  // Like Click Handler
  const handleLikeToggle = async (e) => {
    e.stopPropagation();
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to like this reel.");
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));
    try {
      await toggleLike(video._id);
    } catch (err) {
      console.error("Like toggle failed", err);
      // Rollback
      setLiked(!nextLiked);
      setLikesCount(prev => !nextLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  // Save Click Handler
  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      alert("Please log in to save this reel.");
      return;
    }
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await toggleBookmark(video._id);
    } catch (err) {
      console.error("Bookmark toggle failed", err);
      // Rollback
      setSaved(!nextSaved);
    }
  };

  // Share Click Handler
  const handleShareClick = async (e) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/reels/${video._id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Reel link copied to clipboard!");
      await incrementShares(video._id);
    } catch (err) {
      console.log("Share action failed", err);
    }
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

      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl || video.url || video.video || null}
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
        {/* Like Button */}
        <button onClick={handleLikeToggle} className="flex flex-col items-center group">
          <div className={`w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition ${liked ? 'text-red-500 scale-110' : ''}`}>
            {liked ? <FaHeart /> : <FaRegHeart />}
          </div>
          <span className="text-xs font-bold mt-1 shadow-sm">
            {likesCount}
          </span>
        </button>

        {/* Comment Button */}
        <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
            <LuMessageCircleMore />
          </div>
          <span className="text-xs font-bold mt-1 shadow-sm">
            {commentsCount}
          </span>
        </button>

        {/* Save Button */}
        <button onClick={handleSaveToggle} className="flex flex-col items-center group">
          <div className={`w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition ${saved ? 'text-orange-500 scale-110' : ''}`}>
            <GiSaveArrow />
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wide mt-0.5 ${saved ? 'text-orange-400' : ''}`}>
            {saved ? 'Saved' : 'Save'}
          </span>
        </button>

        {/* Share Button */}
        <button onClick={handleShareClick} className="flex flex-col items-center group">
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
                src={video.authorImage || video.channelImage || video.author?.profileImage || null}
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
                  return (
                    <div key={c._id} className="flex gap-2.5 items-start justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <div className="flex gap-2.5 items-start flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-brand-orange flex-shrink-0 flex items-center justify-center font-bold text-xs border border-white/20 overflow-hidden">
                          {c.user?.profileImage ? (
                            <img src={c.user.profileImage || null} alt="user" className="w-full h-full object-cover" />
                          ) : (
                            (c.user?.name || "U")[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-orange-400 truncate">
                            {c.user?.name || c.user?.username || "Anonymous"}
                          </div>
                          <div className="text-[12px] text-zinc-200 mt-0.5 break-words font-medium leading-relaxed">
                            {c.text}
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-1 font-semibold">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {isOwnComment && (
                        <button
                          onClick={(e) => handleCommentDelete(c._id, e)}
                          className="text-zinc-500 hover:text-red-500 transition text-[11px] p-1 bg-white/5 hover:bg-red-500/10 rounded"
                          title="Delete Comment"
                        >
                          <FaTrash />
                        </button>
                      )}
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
        {/* <div className="flex gap-4 text-xl pointer-events-auto">
          <button className="hover:text-brand-orange transition"><FaSearch /></button>
          <button className="hover:text-brand-orange transition">⋮</button>
        </div> */}
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