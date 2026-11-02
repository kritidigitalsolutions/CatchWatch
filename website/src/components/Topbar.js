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

  // Lock body scroll when mobile slide-over drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

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
        <div className="flex lg:hidden items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Upload Reel Icon - hidden on mobile phones because BottomNav has it in the center */}
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `hidden sm:flex text-xl p-2 transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
            }
            title="Upload Reel"
          >
            <MdCamera />
          </NavLink>

          {isAuthenticated ? (
            <>
              {/* Search Icon - hidden on mobile phones because BottomNav has it */}
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  `hidden sm:flex text-lg font-bold tracking-wide uppercase p-2 transition-colors ${isActive ? "text-brand-orange" : "text-gray-500 hover:text-gray-900"}`
                }
                title="Search"
              >
                <FaSearch />
              </NavLink>

              {/* Chat Icon with Badge */}
              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  `relative p-2 text-xl transition-colors ${isActive ? "text-brand-orange" : "text-gray-600 hover:text-gray-900"}`
                }
                title="Chats"
              >
                <FaComments />
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 bg-brand-orange text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </NavLink>

              {/* Notification Bell Dropdown */}
              <div className="relative" ref={mobileNotifRef}>
                <button
                  onClick={toggleNotificationDropdown}
                  className={`relative p-2 text-xl transition-colors ${isNotifOpen ? "text-brand-orange" : "text-gray-600 hover:text-gray-900"}`}
                  aria-label="Notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-88 sm:max-w-sm bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-down origin-top-right flex flex-col max-h-[75vh]">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="text-sm font-extrabold text-gray-800">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-[11px] text-brand-orange font-bold hover:underline">
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
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
                        <div className="p-8 text-center text-xs text-gray-400 font-medium">No new notifications</div>
                      )}
                    </div>

                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center sticky bottom-0">
                      <button
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigate("/notifications");
                        }}
                        className="text-xs font-bold text-brand-orange hover:text-orange-600 hover:underline w-full transition py-1"
                      >
                        View All Notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* MOBILE PROFILE AVATAR TAB */}
              <NavLink
                to="/profile"
                className="flex items-center p-1 transition-transform active:scale-95"
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
              </NavLink>

              {/* Mobile Hamburger Drawer Trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 text-gray-700 hover:text-brand-orange focus:outline-none transition-colors"
                aria-label="Toggle menu"
              >
                <span className="text-2xl font-light leading-none block">☰</span>
              </button>
            </>
          ) : (
            !isLoginPage && (
              <button
                onClick={() => navigate("/login")}
                className="bg-brand-orange text-white text-[11px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-lg shadow-sm hover:bg-orange-600 transition"
              >
                Sign In
              </button>
            )
          )}
        </div>
      </div>

      {/* Modern Slide-Over Drawer for Mobile / Tablet (< lg screens) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative w-[85vw] max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-slide-in-right">
            <div>
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-white">
                <div className="flex items-center gap-2">
                  <img src="/logo512.png" className="h-8 w-auto object-contain" alt="CatchWatch Logo" />
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-black transition"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* Profile Card if authenticated */}
              {isAuthenticated && userProfile && (
                <div className="p-4 mx-4 my-3 bg-gradient-to-br from-orange-50 to-orange-100/40 rounded-2xl border border-orange-200/60 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-white shadow overflow-hidden bg-brand-orange text-white flex items-center justify-center text-base font-black shrink-0">
                    {userProfile?.profileImage ? (
                      <img src={userProfile.profileImage} alt={userProfile.name || "User"} className="w-full h-full object-cover" />
                    ) : userProfile?.name ? (
                      userProfile.name.charAt(0).toUpperCase()
                    ) : (
                      <FaRegUserCircle className="text-xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-sm text-gray-900 truncate">
                      {userProfile.name || userProfile.username || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{userProfile.username || "creator"}
                    </p>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-xs font-bold text-brand-orange bg-white px-2.5 py-1.5 rounded-lg border border-orange-200 shadow-xs hover:bg-brand-orange hover:text-white transition"
                  >
                    Profile
                  </NavLink>
                </div>
              )}

              {/* App Navigation Categories */}
              <div className="px-5 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2.5">
                  Browse Shows
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                          isActive
                            ? "bg-brand-orange text-white border-brand-orange shadow-sm"
                            : "bg-gray-50/70 text-gray-700 border-gray-100 hover:bg-orange-50 hover:text-brand-orange"
                        }`
                      }
                    >
                      <span>{link.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Creator & Platform Links */}
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2.5">
                  Quick Links
                </p>
                <div className="space-y-1.5">
                  <NavLink
                    to="/upload"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-brand-orange bg-orange-50/70 hover:bg-orange-100 transition border border-orange-200/50"
                  >
                    <span className="flex items-center gap-2">
                      <MdCamera className="text-base" /> Upload Reels
                    </span>
                    <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded-full font-bold">New</span>
                  </NavLink>
                  <NavLink
                    to="/creator-dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span>Creator Dashboard</span>
                    <span className="text-gray-400">›</span>
                  </NavLink>
                  <NavLink
                    to="/leaderboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span>Leaderboard</span>
                    <span className="text-gray-400">›</span>
                  </NavLink>
                  <NavLink
                    to="/subscription"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span>Subscription Plans</span>
                    <span className="text-gray-400">›</span>
                  </NavLink>
                  <NavLink
                    to="/support"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span>Help & Support</span>
                    <span className="text-gray-400">›</span>
                  </NavLink>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("token");
                    localStorage.removeItem("userIsPremium");
                    setIsMobileMenuOpen(false);
                    navigate("/login");
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl text-center shadow-md shadow-red-500/20 transition active:scale-[0.99]"
                >
                  Log Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/login");
                  }}
                  className="w-full bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl text-center shadow-md shadow-orange-500/20 transition active:scale-[0.99]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;