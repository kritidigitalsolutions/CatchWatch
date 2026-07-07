import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { FaBell } from "react-icons/fa6";
import { FaRegUserCircle } from "react-icons/fa";
import { MdCamera } from "react-icons/md";

// Ensure your api imports are correct based on your file structure
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadApi,
  markAsRead as markSingleAsReadApi
} from '../api/notificationApi';

const Topbar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notification Dropdown States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const desktopNotifRef = useRef(null);
  const mobileNotifRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Background polling for unread count every 60 seconds
  useEffect(() => {
    const fetchCount = async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        try {
          const countResponse = await getUnreadCount();
          setUnreadCount(countResponse?.count || countResponse?.unreadCount || 0);
        } catch (error) {
          console.error("Failed to fetch unread count:", error);
        }
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full notifications list when dropdown opens
  const toggleNotificationDropdown = async () => {
    const newState = !isNotifOpen;
    setIsNotifOpen(newState);

    if (newState) {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        try {
          const notifResponse = await getNotifications({ limit: 10 });
          setNotifications(notifResponse?.notifications || notifResponse?.data || []);
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        }
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedDesktop = desktopNotifRef.current && desktopNotifRef.current.contains(event.target);
      const clickedMobile = mobileNotifRef.current && mobileNotifRef.current.contains(event.target);
      if (!clickedDesktop && !clickedMobile) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Handle Mark All As Read
  const markAllAsRead = async () => {
    try {
      // API call to mark all read in database
      await markAllAsReadApi();
      // Instantly update UI without refresh
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  // 2. Handle Single Notification Click
  const handleNotificationClick = async (notif) => {
    const id = notif._id || notif.id;
    const isReadStatus = notif.isRead || notif.read;

    // If unread, mark it as read in database and UI
    if (!isReadStatus) {
      try {
        await markSingleAsReadApi(id);
        setNotifications(prev => prev.map(n =>
          (n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark single notification as read:", error);
      }
    }

    // Close dropdown and navigate to notifications page
    setIsNotifOpen(false);
    navigate("/notifications");
  };

  // Formatting timestamp
  const formatTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const navLinks = [
    { name: "All Shows", path: "/" },
    { name: "Movies", path: "/movies" },
    { name: "Short Films", path: "/shorts" },
    { name: "TV Shows", path: "/tvshows" },
  ];

  const profileLinks = [
    { name: "My Profile", path: "/profile" },
    { name: "Edit Profile", path: "/profile/edit" },
    { name: "Subscription Plans", path: "/subscription" },
    { name: "Downloads", path: "/downloads" },
  ];

  return (
    <header className="sticky top-0 w-full bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex justify-between items-center">

        {/* Brand Logo */}
        <div onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer group">
          <div>
            <img src="/logo192.png" height={90} width={90} alt="logo" />
          </div>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link, index) => (
            <NavLink
              key={index}
              to={link.path}
              className={({ isActive }) =>
                `text-sm font-bold tracking-wide uppercase transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Action Trigger Panels */}
        <div className="hidden md:flex items-center gap-4">
          <div className="">
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                `flex flex-row bg-orange-100 px-3 py-1 rounded-2xl items-center gap-1 tracking-wide  transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
            }
            >
              <span>Upload reels</span>
              <MdCamera />
            </NavLink>
          </div>

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-lg font-bold tracking-wide uppercase transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
            }
          >
            <FaSearch />
          </NavLink>

          {/* DESKTOP NOTIFICATION DROPDOWN */}
          <div className="relative" ref={desktopNotifRef}>
            <button
              onClick={toggleNotificationDropdown}
              className={`relative text-lg p-1 transition-colors ${isNotifOpen ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`}
            >
              <FaBell />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in-down origin-top-right">

                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="text-sm font-extrabold text-gray-800">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-brand-orange font-bold hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => {
                      const isReadStatus = notif.isRead || notif.read;
                      return (
                        <div
                          key={notif._id || notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 border-b border-gray-50 cursor-pointer transition flex gap-3 ${!isReadStatus ? "bg-brand-orange/5 hover:bg-brand-orange/10" : "hover:bg-gray-50"}`}
                        >
                          <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!isReadStatus ? "bg-brand-orange" : "bg-gray-300"}`}></div>
                          <div>
                            <p className={`text-xs ${!isReadStatus ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
                              {notif.message || notif.title || notif.text}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block font-semibold">
                              {formatTime(notif.createdAt || notif.time)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400 font-medium">
                      No new notifications
                    </div>
                  )}
                </div>

                {/* 3. View All Notifications Footer Tab */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center sticky bottom-0">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate("/notifications");
                    }}
                    className="text-xs font-bold text-brand-orange hover:text-orange-600 hover:underline w-full transition"
                  >
                    View All Notifications
                  </button>
                </div>

              </div>
            )}
          </div>

          
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `text-lg font-bold tracking-wide uppercase transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
              }
            >
              <FaRegUserCircle />
            </NavLink>
        </div>

        {/* MOBILE VIEW CONTROLS */}
        <div className="flex md:hidden items-center gap-3">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-lg font-bold tracking-wide uppercase transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
            }
          >
            <FaSearch />
          </NavLink>

          {/* MOBILE NOTIFICATION DROPDOWN */}
          <div className="relative" ref={mobileNotifRef}>
            <button
              onClick={toggleNotificationDropdown}
              className={`relative text-xl p-1 transition-colors ${isNotifOpen ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`}
            >
              <FaBell />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in-down origin-top-right">

                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="text-sm font-extrabold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-brand-orange font-bold hover:underline">
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => {
                      const isReadStatus = notif.isRead || notif.read;
                      return (
                        <div
                          key={notif._id || notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 border-b border-gray-50 cursor-pointer transition flex gap-3 ${!isReadStatus ? "bg-brand-orange/5 hover:bg-brand-orange/10" : "hover:bg-gray-50"}`}
                        >
                          <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!isReadStatus ? "bg-brand-orange" : "bg-gray-300"}`}></div>
                          <div>
                            <p className={`text-xs ${!isReadStatus ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
                              {notif.message || notif.title || notif.text}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block font-semibold">{formatTime(notif.createdAt || notif.time)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400 font-medium">No new notifications</div>
                  )}
                </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center sticky bottom-0">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate("/notifications");
                    }}
                    className="text-xs font-bold text-brand-orange hover:text-orange-600 hover:underline w-full transition"
                  >
                    View All Notifications
                  </button>
                </div>

              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-2xl text-gray-700 focus:outline-none p-1 ml-1"
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Side Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-inner animate-fade-in-down">
          <div className="px-4 py-3 border-b border-gray-50 bg-brand-light-bg/30">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              App Links
            </span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {navLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(link.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left py-2 px-3 bg-white border border-gray-100 rounded-lg text-xs font-bold text-gray-700 hover:text-brand-orange"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Account & Settings
            </span>
            {profileLinks.map((link, i) => (
              <button
                key={i}
                onClick={() => {
                  navigate(link.path);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left py-2.5 px-2 text-sm font-semibold text-gray-600 hover:bg-brand-light-bg/50 hover:text-brand-orange rounded-lg block"
              >
                {link.name}
              </button>
            ))}
            <div className="pt-2 border-t border-gray-100 mt-2 pb-2">
              <button
                onClick={() => {
                  navigate("/login");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-brand-orange text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl text-center shadow-sm"
              >
                Join Premium / Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;