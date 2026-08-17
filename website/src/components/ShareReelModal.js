import React, { useState, useEffect } from "react";
import { 
  FaPaperPlane, 
  FaTimes, 
  FaSearch, 
  FaCopy, 
  FaWhatsapp, 
  FaCheck, 
  FaShareAlt,
  FaPlay
} from "react-icons/fa";
import { getConversations, sendMessage } from "../api/chatApi";
import { incrementShares } from "../api/reelsApi";

const ShareReelModal = ({ isOpen, onClose, reel }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentMap, setSentMap] = useState({});
  const [sendingMap, setSendingMap] = useState({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const reelId = reel?._id || reel?.id;
  const shareUrl = reelId ? `${window.location.origin}/reels/${reelId}` : window.location.href;

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setSentMap({});
      fetchConvs();
    }
  }, [isOpen]);

  const fetchConvs = async () => {
    setLoading(true);
    try {
      const res = await getConversations();
      if (res && res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Failed to load conversations for sharing reel:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !reel) return null;

  // Handle send directly into chat
  const handleSendToChat = async (recipientId) => {
    if (!recipientId || sendingMap[recipientId] || sentMap[recipientId]) return;

    setSendingMap((prev) => ({ ...prev, [recipientId]: true }));
    try {
      const reelTitle = reel.caption || reel.title || "Check out this Reel on CatchWatch!";
      const creatorName = reel.user?.name || reel.author?.name || "CatchWatch Creator";
      const creatorUsername = reel.user?.username || reel.author?.username || "";
      const creatorImage = reel.user?.profileImage || reel.authorImage || "";
      const thumbUrl = reel.thumbnailUrl || reel.thumbnail || reel.mediaUrl || "";

      await sendMessage({
        recipientId,
        messageType: "reel",
        text: reelTitle,
        mediaUrl: thumbUrl,
        mediaMeta: {
          isReelShare: true,
          reelId: reelId,
          title: reelTitle,
          caption: reelTitle,
          creatorName,
          creatorUsername,
          creatorImage,
          shareUrl,
          thumbnailUrl: thumbUrl,
        },
      });

      if (reelId) {
        incrementShares(reelId).catch(() => {});
      }

      setSentMap((prev) => ({ ...prev, [recipientId]: true }));
    } catch (err) {
      console.error("Failed to send reel in chat:", err);
      alert(err.response?.data?.message || "Failed to send in chat.");
    } finally {
      setSendingMap((prev) => ({ ...prev, [recipientId]: false }));
    }
  };

  // Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (reelId) incrementShares(reelId).catch(() => {});
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Copy link error:", e);
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Watch this Reel on CatchWatch: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    if (reelId) incrementShares(reelId).catch(() => {});
  };

  // Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.caption || reel.title || "CatchWatch Reel",
          text: "Check out this reel on CatchWatch!",
          url: shareUrl,
        });
        if (reelId) incrementShares(reelId).catch(() => {});
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Web share failed:", err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const filteredConvs = conversations.filter((conv) => {
    const name = conv.partner?.name || "";
    const username = conv.partner?.username || "";
    const query = searchQuery.toLowerCase().trim();
    return name.toLowerCase().includes(query) || username.toLowerCase().includes(query);
  });

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-sm">
              <FaShareAlt />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Share Reel</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Send in CatchWatch chat or social apps</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Reel Snippet Card */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-12 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-200 dark:border-gray-700 shadow-xs">
            {reel.thumbnailUrl || reel.thumbnail ? (
              <img 
                src={reel.thumbnailUrl || reel.thumbnail} 
                alt="thumbnail" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
                <FaPlay />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {reel.user?.name || reel.author?.name || "CatchWatch Creator"}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
              {reel.caption || reel.title || "No caption"}
            </p>
          </div>
        </div>

        {/* Send to Chats Search */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-3 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search chat contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-gray-50 dark:divide-gray-800/40 min-h-[160px] max-h-[260px] custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredConvs.length > 0 ? (
            filteredConvs.map((conv) => {
              const partner = conv.partner;
              const partnerId = partner?._id || partner?.id;
              const isSent = sentMap[partnerId];
              const isSending = sendingMap[partnerId];

              return (
                <div 
                  key={conv._id}
                  className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <img 
                      src={partner?.profileImage || "/logo192.png"} 
                      alt={partner?.name} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0" 
                    />
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-gray-800 dark:text-white truncate">
                        {partner?.name || "User"}
                      </h5>
                      <p className="text-[10px] text-gray-400 truncate">
                        @{partner?.username || "user"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendToChat(partnerId)}
                    disabled={isSending || isSent}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 shadow-xs ${
                      isSent
                        ? "bg-emerald-500 text-white cursor-default"
                        : isSending
                        ? "bg-brand-orange/60 text-white cursor-wait"
                        : "bg-brand-orange hover:bg-orange-600 text-white active:scale-95"
                    }`}
                  >
                    {isSent ? (
                      <>
                        <FaCheck className="text-[10px]" /> Sent
                      </>
                    ) : isSending ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FaPaperPlane className="text-[10px]" /> Send
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-xs text-gray-400 font-medium">
              {searchQuery ? `No chats matching "${searchQuery}"` : "No recent chats found"}
            </div>
          )}
        </div>

        {/* Quick Social Share Actions Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-around gap-2">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              copied
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
            }`}
          >
            {copied ? <FaCheck className="text-emerald-500 text-sm" /> : <FaCopy className="text-sm" />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 py-2 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <FaWhatsapp className="text-base" />
            <span>WhatsApp</span>
          </button>

          {/* Native Share / More */}
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              title="More sharing options"
            >
              <FaShareAlt className="text-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareReelModal;
