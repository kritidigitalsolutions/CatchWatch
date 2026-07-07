import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegHeart, FaHeart, FaItunesNote, FaPlay, FaEye, FaTimes, FaTrash } from "react-icons/fa";
import { FaShareNodes } from "react-icons/fa6";
import { LuMessageCircleMore } from "react-icons/lu";
import { GiSaveArrow } from "react-icons/gi";
import Loader from '../components/Loader';

// APIs Import
import { getReelById, incrementViews, incrementShares } from '../api/reelsApi';
import { toggleLike, toggleBookmark, getContentInteractions } from '../api/interactionApi';
import { addComment, getComments, deleteComment } from '../api/commentApi';

// Helper to decode JWT token to get current user ID
const getLoggedInUserId = () => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).id;
  } catch (e) {
    return null;
  }
};

const SingleReelPage = () => {
  const { id } = useParams(); // URL se reel ki ID nikalna
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [reel, setReel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Interactive States
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);

  // 1. Fetch Single Reel Data
  useEffect(() => {
    const fetchReel = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getReelById(id);
        const data = response?.reel || response?.data || response;
        setReel(data);

        // Jab reel load ho jaye, tab background me view count badha dein
        incrementViews(id).catch(err => console.log("View increment failed", err));

      } catch (err) {
        console.error("Error fetching single reel:", err);
        setError("This video is unavailable or has been deleted.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReel();
  }, [id]);

  // Sync state once reel is loaded
  useEffect(() => {
    if (reel) {
      setLikesCount(reel.likesCount || reel.likes?.length || 0);
      setCommentsCount(reel.commentsCount || reel.comments?.length || 0);
      setLiked(reel.userInteraction === "like");
      
      const fetchInteractions = async () => {
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        if (!token) return;
        try {
          const stats = await getContentInteractions(reel._id || id);
          setLiked(stats.userInteraction === "like");
          setSaved(stats.isBookmarked);
          setLikesCount(stats.likes || 0);
        } catch (e) {
          console.log("Error fetching stats:", e);
        }
      };
      fetchInteractions();
    }
  }, [reel, id]);

  // Fetch comments when comments section is opened
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        const res = await getComments(id);
        setComments(res.comments || res.data || []);
        setCommentsCount(res.total || res.comments?.length || 0);
      } catch (e) {
        console.log("Error loading comments:", e);
      } finally {
        setIsLoadingComments(false);
      }
    };

    if (showComments) {
      fetchComments();
    }
  }, [showComments, id]);

  // Autoplay handler
  useEffect(() => {
    if (reel && videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false)); // Browser block kare toh pause dikhayein
    }
  }, [reel]);

  // Video Play/Pause Toggle
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
      await toggleLike(id);
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
      await toggleBookmark(id);
    } catch (err) {
      console.error("Bookmark toggle failed", err);
      // Rollback
      setSaved(!nextSaved);
    }
  };

  // Share functionality
  const handleShare = async (e) => {
    if (e) e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/reels/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Reel link copied to clipboard!");
      await incrementShares(id);
    } catch (err) {
      console.log("Share failed", err);
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
      const res = await addComment(id, { text: commentText });
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

  if (isLoading) return <Loader />;

  if (error || !reel) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh]">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Video Not Found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full bg-black sm:rounded-2xl overflow-hidden relative shadow-2xl h-[100dvh] sm:h-auto sm:aspect-[9/16] sm:my-6 flex flex-col">
      
      {/* Top Navigation Bar overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20 text-white">
        <button onClick={() => navigate(-1)} className="text-xl hover:text-brand-orange transition p-2 bg-black/30 rounded-full backdrop-blur-sm z-20">
          <FaArrowLeft />
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
          <FaEye className="text-brand-orange" /> {reel.viewsCount || reel.views || 0}
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 relative bg-zinc-950 flex justify-center items-center">
        <video
          ref={videoRef}
          src={reel.videoUrl || reel.url || reel.video || null}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          onClick={togglePlay}
        />

        {/* Big Play Icon when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center text-white text-3xl backdrop-blur-md pl-2 shadow-xl border border-white/10">
              <FaPlay />
            </div>
          </div>
        )}

        {/* Floating Side Actions */}
        <div className="absolute bottom-28 right-4 flex flex-col gap-6 items-center z-20 text-white animate-fade-in">
          {/* Like button */}
          <button onClick={handleLikeToggle} className="flex flex-col items-center group">
            <div className={`w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition ${liked ? 'text-red-500 scale-110' : ''}`}>
              {liked ? <FaHeart /> : <FaRegHeart />}
            </div>
            <span className="text-xs font-bold mt-1.5 drop-shadow-md">{likesCount}</span>
          </button>
          
          {/* Comment button */}
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
              <LuMessageCircleMore />
            </div>
            <span className="text-xs font-bold mt-1.5 drop-shadow-md">{commentsCount}</span>
          </button>

          {/* Save button */}
          <button onClick={handleSaveToggle} className="flex flex-col items-center group">
            <div className={`w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition ${saved ? 'text-orange-500 scale-110' : ''}`}>
              <GiSaveArrow />
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wide mt-1.5 drop-shadow-md ${saved ? 'text-orange-400 font-extrabold' : ''}`}>
              {saved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Share button */}
          <button onClick={handleShare} className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl group-hover:bg-white/20 transition">
              <FaShareNodes />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wide mt-1.5 drop-shadow-md">Share</span>
          </button>
        </div>

        {/* Bottom Description Overlay */}
        <div className="absolute bottom-6 left-4 right-20 z-20 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 rounded-xl backdrop-blur-sm border border-white/10">
          <h2 className="font-extrabold tracking-wide text-sm sm:text-base mb-1 drop-shadow-md">
            {reel.title || "My Studio Reel"}
          </h2>
          <p className="text-xs text-gray-200 font-medium mb-3 line-clamp-2">
            {reel.description || reel.caption || "Enjoy this reel exclusively on CatchWatch."}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-300 font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/5">
            <FaItunesNote className="text-brand-orange" />
            <span className="truncate max-w-[150px]">Original Audio - {reel.user?.name || "User"}</span>
          </div>
        </div>
      </div>

      {/* Comments Drawer overlay */}
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
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 animate-fade-in">
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

export default SingleReelPage;