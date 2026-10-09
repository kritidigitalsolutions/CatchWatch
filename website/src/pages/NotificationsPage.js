import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBell, FaTrashAlt, FaCheckDouble } from 'react-icons/fa';
import Loader from '../components/Loader';
import VerifiedBadge from '../components/VerifiedBadge';
import NotificationDetailModal from '../components/NotificationDetailModal';

// APIs import karein
import { 
  getNotifications, 
  markAllAsRead, 
  markAsRead, 
  deleteNotification 
} from '../api/notificationApi';

const TYPE_TAGS = {
  CONTENT_ALERT: { label: "Content Alert", color: "bg-purple-100 text-purple-700 border-purple-200" },
  NEW_MOVIE: { label: "Movie", color: "bg-amber-100 text-amber-700 border-amber-200" },
  NEW_SERIES: { label: "Series", color: "bg-pink-100 text-pink-700 border-pink-200" },
  NEW_TV_SHOW: { label: "TV Show", color: "bg-blue-100 text-blue-700 border-blue-200" },
  NEW_SHORT_FILM: { label: "Short Film", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  SUBSCRIPTION: { label: "Subscription", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ORANGETICK: { label: "Orange Tick", color: "bg-orange-100 text-orange-700 border-orange-200" },
  BLUETICK: { label: "Orange Tick", color: "bg-orange-100 text-orange-700 border-orange-200" },
  VERIFICATION: { label: "Verification", color: "bg-sky-100 text-sky-700 border-sky-200" },
  PROMOTIONAL: { label: "Promotion", color: "bg-orange-100 text-orange-700 border-orange-200" },
  REEL: { label: "Reel", color: "bg-rose-100 text-rose-700 border-rose-200" },
  CHAT: { label: "Chat", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CALL: { label: "Call", color: "bg-orange-100 text-orange-700 border-orange-200" },
  GENERAL: { label: "Update", color: "bg-gray-100 text-gray-700 border-gray-200" },
  SYSTEM: { label: "System", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

const NotificationsPage = () => {
  const navigate = useNavigate();

  // States
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotifForModal, setSelectedNotifForModal] = useState(null);

  // 1. Fetch Notifications on Mount
  useEffect(() => {
    const fetchAllNotifications = async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      
      if (!token) {
        setError("You must be logged in to view notifications.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getNotifications({ limit: 50 });
        const fetchedData = response?.notifications || response?.data || response || [];
        setNotifications(Array.isArray(fetchedData) ? fetchedData : []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        if (err.response && err.response.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load notifications. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllNotifications();
  }, []);

  // 2. Handle Mark All As Read
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // 3. Handle Single Item Click (Mark as Read & Open Center Pop-up)
  const handleNotificationClick = async (notif) => {
    const id = notif._id || notif.id;
    const isReadStatus = notif.isRead || notif.read;

    if (!isReadStatus) {
      try {
        setNotifications(prev => prev.map(n => 
          (n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n
        ));
        await markAsRead(id);
      } catch (error) {
        console.error(`Failed to mark notification ${id} as read:`, error);
      }
    }

    // Open center modal popup with full details
    setSelectedNotifForModal(notif);
  };

  // 4. Handle Delete Notification
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const previousNotifications = [...notifications];
    setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id));

    try {
      await deleteNotification(id);
    } catch (error) {
      console.error(`Failed to delete notification ${id}:`, error);
      setNotifications(previousNotifications);
    }
  };

  // Helper function to format timestamp
  const formatTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const unreadExist = notifications.some(n => !(n.isRead || n.read));

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 py-6 px-4 sm:px-6">
      
      {/* Center Pop-up Modal */}
      {selectedNotifForModal && (
        <NotificationDetailModal
          notification={selectedNotifForModal}
          onClose={() => setSelectedNotifForModal(null)}
        />
      )}

      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
            <FaArrowLeft />
          </button>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <FaBell /> Notifications & Messages
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 min-h-[60vh] flex flex-col">
        
        {/* Action Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">
            All Messages ({notifications.length})
          </h3>
          {unreadExist && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-brand-orange hover:text-orange-600 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg transition"
            >
              <FaCheckDouble /> Mark all as read
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-10 flex flex-col items-center">
            <p className="text-red-500 font-bold mb-4">{error}</p>
            {error.includes("logged in") || error.includes("Session") ? (
              <button onClick={() => navigate('/login')} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
                Log In Now
              </button>
            ) : null}
          </div>
        )}

        {/* Notifications List */}
        {!error && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const id = notif._id || notif.id;
              const isReadStatus = notif.isRead || notif.read;
              const thumb = notif.imageUrl || notif.image || notif.metadata?.imageUrl;
              const tagCfg = TYPE_TAGS[notif.type] || TYPE_TAGS.GENERAL;

              return (
                <div 
                  key={id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition group cursor-pointer ${
                    !isReadStatus 
                      ? 'bg-orange-50/60 border-orange-200/80 hover:bg-orange-100/60 shadow-sm' 
                      : 'bg-gray-50 border-gray-100 hover:bg-gray-100/80'
                  }`}
                >
                  {/* Status Indicator / Thumbnail Image */}
                  {thumb ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-200 bg-black flex-shrink-0 shadow-sm">
                      <img 
                        src={thumb} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      !isReadStatus ? 'bg-brand-orange text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <FaBell className="text-xl" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className={`text-sm sm:text-base flex items-center gap-1.5 ${!isReadStatus ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                        <span>{notif.title || "New Update"}</span>
                        {(notif.type === "VERIFICATION" || notif.type === "ORANGETICK" || notif.type === "BLUETICK" || notif.title?.includes("Verified")) && (
                          <VerifiedBadge isVerified={true} size="sm" />
                        )}
                      </h4>
                      
                      {notif.type && (
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${tagCfg.color}`}>
                          {tagCfg.label}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed line-clamp-2">
                      {notif.message || notif.text}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-gray-400 font-semibold">
                        {formatTime(notif.createdAt || notif.time)}
                      </span>

                      {notif.actionUrl && (
                        <span className="text-[11px] text-brand-orange font-bold flex items-center gap-1">
                          View details ➔
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button (Visible on Hover) */}
                  <button 
                    onClick={(e) => handleDelete(e, id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Message"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FaBell className="text-5xl mb-4 opacity-20" />
            <p className="text-sm font-bold">You're all caught up!</p>
            <p className="text-xs mt-1">No new messages or notifications right now.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationsPage;