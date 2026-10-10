import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaSearch, FaCaretDown, FaComments } from "react-icons/fa";
import { FaBell } from "react-icons/fa6";
import { FaRegUserCircle } from "react-icons/fa";
import { MdCamera } from "react-icons/md";
import { useSocket } from "../context/SocketContext";

// Ensure your api imports are correct based on your file structure
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadApi,
  markAsRead as markSingleAsReadApi
} from '../api/notificationApi';
import { getUserProfile } from '../api/userApi';
import NotificationDetailModal from './NotificationDetailModal';

const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadChatCount } = useSocket() || {};
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoginPage = location.pathname === "/login";
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  const isAuthenticated = !!token;

  // Notification Dropdown States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const desktopNotifRef = useRef(null);
  const mobileNotifRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedNotifForModal, setSelectedNotifForModal] = useState(null);

  // Background polling for unread count & profile fetch
  useEffect(() => {
    const fetchCountAndProfile = async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        try {
          const countResponse = await getUnreadCount();
          setUnreadCount(countResponse?.count || countResponse?.unreadCount || 0);
        } catch (error) {
          console.error("Failed to fetch unread count:", error);
        }
        try {
          const profileRes = await getUserProfile();
          const userObj = profileRes?.user || profileRes?.data || profileRes;
          if (userObj) {
            setUserProfile(userObj);
          }
        } catch (pErr) {
          console.error("Failed to fetch topbar user profile:", pErr);
        }
      }
    };

    fetchCountAndProfile();
    const interval = setInterval(fetchCountAndProfile, 60000);
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

    // Close dropdown and open center modal
    setIsNotifOpen(false);
    setSelectedNotifForModal(notif);
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
    { name: "TV Shows", path: "/tv-shows" },
    { name: "Short Films", path: "/short-films" },
    { name: "Web Series", path: "/series" },
    { name: "Reels", path: "/reels" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm transition-all">
      {selectedNotifForModal && (
        <NotificationDetailModal
          notification={selectedNotifForModal}
          onClose={() => setSelectedNotifForModal(null)}
        />
      )}
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between gap-4">

        {/* LOGO */}
        <div className="flex items-center flex-shrink-0">
          <NavLink to="/" className="flex items-center gap-2">
            <img
              src="/logo512.png"
              className="h-10 sm:h-12 w-auto object-contain"
              alt="CatchWatch Logo"
            />
          </NavLink>
        </div>

        {/* CENTER: DESKTOP NAVIGATION TABS */}
        <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-7 flex-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `text-xs xl:text-sm font-bold uppercase tracking-wider transition-colors hover:text-brand-orange ${
                  isActive ? "text-brand-orange font-black" : "text-gray-600"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* DESKTOP RIGHT ACTIONS */}
        <div className="hidden lg:flex items-center justify-end gap-3.5 xl:gap-5 flex-shrink-0">
          {/* UPLOAD REEL BUTTON & ICON */}
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                isActive
                  ? "bg-brand-orange text-white shadow-orange-500/20"
                  : "bg-orange-50 text-brand-orange hover:bg-brand-orange hover:text-white border border-orange-200/70"
              }`
            }
            title="Upload Reel"
          >
            <MdCamera className="text-base" />
            <span>Upload Reel</span>
          </NavLink>

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-gray-500 hover:text-gray-900 text-base p-2 transition-colors ${isActive ? "text-brand-orange font-bold" : ""
              }`
            }
            title="Search"
          >
            <FaSearch />
          </NavLink>

          {isAuthenticated ? (
            <>
              {/* DESKTOP CHAT ICON */}
              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  `relative text-gray-500 hover:text-gray-900 text-lg p-1.5 transition-colors ${isActive ? "text-brand-orange font-bold" : ""
                  }`
                }
                title="Chats"
              >
                <FaComments />
                {unreadChatCount > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-orange text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </NavLink>

              {/* DESKTOP NOTIFICATION DROPDOWN */}
              <div className="relative" ref={desktopNotifRef}>
                <button
                  onClick={toggleNotificationDropdown}
                  className={`relative text-gray-500 hover:text-gray-900 text-lg p-1.5 transition-colors ${isNotifOpen ? "text-brand-orange" : ""}`}
                  title="Notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-88 sm:w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-down origin-top-right">
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
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => {
                          const isReadStatus = notif.isRead || notif.read;
                          const thumb = notif.imageUrl || notif.image || notif.metadata?.imageUrl;
                          return (
                            <div
                              key={notif._id || notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${!isReadStatus ? "bg-orange-50/60 hover:bg-orange-100/50" : "hover:bg-gray-50"}`}
                            >
                              {thumb ? (
                                <div className="w-11 h-11 rounded-lg overflow-hidden border border-gray-200 bg-black flex-shrink-0">
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${!isReadStatus ? "bg-brand-orange text-white" : "bg-gray-100 text-gray-400"}`}>
                                  <FaBell />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className={`text-xs truncate ${!isReadStatus ? "font-black text-gray-900" : "font-bold text-gray-700"}`}>
                                    {notif.title || "Notification"}
                                  </p>
                                  {!isReadStatus && <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0"></span>}
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                                  {notif.message || notif.text}
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

                    {/* Footer Tab */}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center sticky bottom-0">
                      <button
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigate("/notifications");
                        }}
                        className="text-xs font-bold text-brand-orange hover:text-orange-600 hover:underline w-full transition flex items-center justify-center gap-1.5"
                      >
                        <span>View All Notifications</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <NavLink
                to="/profile"
                className="flex items-center gap-1.5 p-1 transition-transform hover:scale-105"
                title="Profile"
              >
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 overflow-hidden bg-brand-orange text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                  {userProfile?.profileImage ? (
                    <img src={userProfile.profileImage} alt={userProfile.name || "User"} className="w-full h-full object-cover" />
                  ) : userProfile?.name ? (
                    userProfile.name.charAt(0).toUpperCase()
                  ) : (
                    <FaRegUserCircle className="text-base" />
                  )}
                </div>
                <FaCaretDown className="text-gray-600 text-xs" />
              </NavLink>
            </>
          ) : (
            !isLoginPage && (
              <button
                onClick={() => navigate("/login")}
                className="bg-brand-orange text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl shadow-sm hover:bg-orange-600 transition"
              >
                Sign In
              </button>
            )
          )}
        </div>

        {/* MOBILE & TABLET VIEW CONTROLS (< lg screens) */}
        <div className="flex lg:hidden items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `text-xl p-1 transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
            }
            title="Upload Reel"
          >
            <MdCamera />
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  `text-lg font-bold tracking-wide uppercase p-1 transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
                }
              >
                <FaSearch />
              </NavLink>

              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  `relative text-xl p-1 transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
                }
                title="Chats"
              >
                <FaComments />
                {unreadChatCount > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-orange text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </NavLink>

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

                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => {
                          const isReadStatus = notif.isRead || notif.read;
                          const thumb = notif.imageUrl || notif.image || notif.metadata?.imageUrl;
                          return (
                            <div
                              key={notif._id || notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${!isReadStatus ? "bg-orange-50/60 hover:bg-orange-100/50" : "hover:bg-gray-50"}`}
                            >
                              {thumb ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-black flex-shrink-0">
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              ) : (
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${!isReadStatus ? "bg-brand-orange text-white" : "bg-gray-100 text-gray-400"}`}>
                                  <FaBell />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <p className={`text-xs truncate ${!isReadStatus ? "font-black text-gray-900" : "font-bold text-gray-700"}`}>
                                  {notif.title || "Notification"}
                                </p>
                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                                  {notif.message || notif.text}
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

              {/* MOBILE PROFILE AVATAR TAB (< 1024px) */}
              <NavLink
                to="/profile"
                className="flex items-center p-0.5 transition-transform hover:scale-105"
                title="Profile"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-orange-200 overflow-hidden bg-brand-orange text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                  {userProfile?.profileImage ? (
                    <img src={userProfile.profileImage} alt={userProfile.name || "User"} className="w-full h-full object-cover" />
                  ) : userProfile?.name ? (
                    userProfile.name.charAt(0).toUpperCase()
                  ) : (
                    <FaRegUserCircle className="text-sm sm:text-base" />
                  )}
                </div>
              </NavLink>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-2xl text-gray-700 focus:outline-none p-1 ml-1"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>
            </>
          ) : (
            !isLoginPage && (
              <button
                onClick={() => navigate("/login")}
                className="bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-sm hover:bg-orange-600 transition"
              >
                Sign In
              </button>
            )
          )}
        </div>
      </div>

      {/* Mobile / Tablet Side Menu */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white shadow-inner animate-fade-in-down max-h-[85vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-50 bg-brand-light-bg/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                App Links
              </span>
              <NavLink
                to="/upload"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-1 bg-orange-100 text-brand-orange text-xs font-bold px-3 py-1 rounded-full"
              >
                <span>Upload reels</span>
                <MdCamera className="text-sm" />
              </NavLink>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(link.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left py-2 px-3 bg-white border border-gray-100 rounded-lg text-xs font-bold text-gray-700 hover:text-brand-orange hover:bg-orange-50 transition"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 space-y-1">
            <div className="pt-2 border-t border-gray-100 mt-2 pb-2">
              <button
                onClick={() => {
                  localStorage.removeItem("authToken");
                  localStorage.removeItem("token");
                  localStorage.removeItem("userIsPremium");
                  setIsMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="w-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl text-center shadow-sm hover:bg-red-700 transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;