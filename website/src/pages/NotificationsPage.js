import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBell, FaTrashAlt, FaCheckDouble } from 'react-icons/fa';
import Loader from '../components/Loader';

// APIs import karein
import { 
  getNotifications, 
  markAllAsRead, 
  markAsRead, 
  deleteNotification 
} from '../api/notificationApi';

const NotificationsPage = () => {
  const navigate = useNavigate();

  // States
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        // Fetching with a limit to get recent messages
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
      // Optimistic UI Update: Frontend par turant sabko read mark karein
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      
      // Backend API Call
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // 3. Handle Single Item Click (Mark as Read & Navigate)
  const handleNotificationClick = async (notif) => {
    const id = notif._id || notif.id;
    const isReadStatus = notif.isRead || notif.read;

    // Agar unread है, toh read mark karein
    if (!isReadStatus) {
      try {
        // Optimistic UI Update
        setNotifications(prev => prev.map(n => 
          (n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n
        ));
        
        // Backend API Call
        await markAsRead(id);
      } catch (error) {
        console.error(`Failed to mark notification ${id} as read:`, error);
      }
    }

    // Navigate logic agar notification me link maujood ho
    if (notif.link || notif.actionUrl) {
      navigate(notif.link || notif.actionUrl);
    }
  };

  // 4. Handle Delete Notification
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Card click event trigger hone se rokein
    
    // Optimistic UI Update: Turant list se hata dein
    const previousNotifications = [...notifications];
    setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id));

    try {
      // Backend API Call
      await deleteNotification(id);
    } catch (error) {
      console.error(`Failed to delete notification ${id}:`, error);
      // Agar API fail ho jaye, toh deleted item wapas le aayein
      setNotifications(previousNotifications);
    }
  };

  // Helper function to format timestamp
  const formatTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // Check if any unread notification exists to show the "Mark all as read" button
  const unreadExist = notifications.some(n => !(n.isRead || n.read));

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 py-6 px-4 sm:px-6">
      
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

              return (
                <div 
                  key={id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition group cursor-pointer ${
                    !isReadStatus 
                      ? 'bg-brand-orange/5 border-brand-orange/20 hover:bg-brand-orange/10' 
                      : 'bg-gray-50 border-gray-100 hover:bg-gray-100/80'
                  }`}
                >
                  {/* Status Indicator / Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    !isReadStatus ? 'bg-brand-orange text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <FaBell className="text-lg" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <h4 className={`text-sm sm:text-base mb-1 ${!isReadStatus ? 'font-extrabold text-gray-900' : 'font-bold text-gray-700'}`}>
                      {notif.title || "New Update"}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                      {notif.message || notif.text}
                    </p>
                    <span className="text-[10px] text-gray-400 font-bold mt-2 block">
                      {formatTime(notif.createdAt || notif.time)}
                    </span>
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