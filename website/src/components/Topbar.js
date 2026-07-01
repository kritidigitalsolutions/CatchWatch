import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { FaBell } from "react-icons/fa6";
import { FaRegUserCircle } from "react-icons/fa";
import { MdCamera } from "react-icons/md";

const Topbar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Notification Dropdown Logic
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Mock Notifications Data (Future me API se aayega)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "New Blockbuster 'The Past' is now streaming!",
      time: "2 mins ago",
      isRead: false,
    },
    {
      id: 2,
      text: "Your subscription renews tomorrow.",
      time: "1 hour ago",
      isRead: false,
    },
    {
      id: 3,
      text: "Welcome to CatchWatch Premium!",
      time: "1 day ago",
      isRead: true,
    },
    {
      id: 4,
      text: "Welcome to CatchWatch Premium!",
      time: "1 day ago",
      isRead: true,
    },
    {
      id: 5,
      text: "Welcome to CatchWatch Premium!",
      time: "1 day ago",
      isRead: true,
    },
    {
      id: 6,
      text: "Welcome to CatchWatch Premium!",
      time: "1 day ago",
      isRead: true,
    },
  ]);

  // Unread count nikalne ke liye
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Bahar click karne par dropdown close karne ka logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sabhi ko Read mark karne ka function
  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
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
        {/* Brand Identity Branding Panel Area */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="">
            <img src="logo512.png" height={90} width={90} alt="logo" />
          </div>
          {/* <span className="text-xl md:text-2xl font-black text-brand-orange tracking-wide">
            CATCHWATCH
          </span> */}
        </div>

        {/* Desktop View Navigation Links Stream */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link, index) => (
            <NavLink
              key={index}
              to={link.path}
              className={({ isActive }) =>
                `text-sm font-bold tracking-wide uppercase transition-colors ${
                  isActive
                    ? "text-brand-orange"
                    : "text-gray-500 hover:text-gray-900"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Action Trigger Panels */}
        <div className="hidden md:flex items-center gap-4">
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `text-xl font-bold tracking-wide uppercase transition-colors ${
                isActive
                  ? "text-brand-orange"
                  : "text-gray-500 hover:text-gray-900"
              }`
            }
          >
            <MdCamera />
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-lg font-bold tracking-wide uppercase transition-colors ${
                isActive
                  ? "text-brand-orange"
                  : "text-gray-500 hover:text-gray-900"
              }`
            }
          >
            <FaSearch />
          </NavLink>
          {/* NOTIFICATION DROPDOWN */}
          <div className="relative" ref={notifRef}>
            {/* Bell Icon Trigger Button */}
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative text-lg p-1 transition-colors ${
                isNotifOpen
                  ? "text-brand-orange"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <FaBell />

              {/* Unread Red Dot Indicator */}
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Box */}
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
                <div className="max-h-72 overflow-y-auto ">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-50 cursor-pointer transition flex gap-3 ${
                          !notif.isRead
                            ? "bg-brand-orange/5 hover:bg-brand-orange/10"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Status Dot */}
                        <div
                          className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                            !notif.isRead ? "bg-brand-orange" : "bg-gray-300"
                          }`}
                        ></div>

                        {/* Notification Text */}
                        <div>
                          <p
                            className={`text-xs ${!notif.isRead ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}
                          >
                            {notif.text}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-1 block font-semibold">
                            {notif.time}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400 font-medium">
                      No new notifications
                    </div>
                  )}
                </div>

                {/* Footer Link */}
                {/* <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                  <NavLink
                    to="/notifications" // If you create a separate page in future
                    onClick={() => {
                      setIsNotifOpen(false);
                    }}
                    className="text-xs font-bold text-brand-orange hover:underline"
                  >
                    View All Notifications
                  </NavLink>
                </div> */}
              </div>
            )}
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `text-lg font-bold tracking-wide uppercase transition-colors ${
                isActive
                  ? "text-brand-orange"
                  : "text-gray-500 hover:text-gray-900"
              }`
            }
          >
            <FaRegUserCircle />
          </NavLink>
        </div>

        {/* Mobile View Functional Controls Module */}
        <div className="flex md:hidden items-center gap-3">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-lg font-bold tracking-wide uppercase transition-colors ${
                isActive
                  ? "text-brand-orange"
                  : "text-gray-500 hover:text-gray-900"
              }`
            }
          >
            <FaSearch />
          </NavLink>
          {/* NOTIFICATION DROPDOWN */}
          <div className="relative" ref={notifRef}>
            {/* Bell Icon Trigger Button */}
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative text-xl p-1 transition-colors ${
                isNotifOpen
                  ? "text-brand-orange"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <FaBell />

              {/* Unread Red Dot Indicator */}
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Box */}
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
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-50 cursor-pointer transition flex gap-3 ${
                          !notif.isRead
                            ? "bg-brand-orange/5 hover:bg-brand-orange/10"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Status Dot */}
                        <div
                          className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                            !notif.isRead ? "bg-brand-orange" : "bg-gray-300"
                          }`}
                        ></div>

                        {/* Notification Text */}
                        <div>
                          <p
                            className={`text-xs ${!notif.isRead ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}
                          >
                            {notif.text}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-1 block font-semibold">
                            {notif.time}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400 font-medium">
                      No new notifications
                    </div>
                  )}
                </div>

                {/* Footer Link */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate("/notifications"); // If you create a separate page in future
                    }}
                    className="text-xs font-bold text-brand-orange hover:underline"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menu Drawer Hamburger Button Controller */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-2xl text-gray-700 focus:outline-none p-1 ml-1"
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Side Menu/Drawer Panel Backdrop System Overlay */}
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
                  navigate("/subscription");
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
