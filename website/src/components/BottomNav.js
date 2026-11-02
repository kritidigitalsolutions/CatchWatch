import React from 'react';
import { NavLink } from 'react-router-dom';
import { IoMdHome } from "react-icons/io";
import { TfiVideoClapper } from "react-icons/tfi";
import { IoSearchSharp } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { MdCamera } from "react-icons/md";
// import { FaComments } from "react-icons/fa";
// import { useSocket } from "../context/SocketContext";

const BottomNav = () => {
  // const { unreadChatCount } = useSocket() || {};

  const navItems = [
    { name: 'Home', path: '/', icon: <IoMdHome />  },
    { name: 'REELS', path: '/reels-feed', icon: <TfiVideoClapper /> },
    { name: 'Add', path: '/upload', icon: <MdCamera />, isAdd: true },
    // { name: 'Chat', path: '/chat', icon: <FaComments />, badge: unreadChatCount },
    { name: 'Search', path: '/search', icon: <IoSearchSharp /> },
    { name: 'Profile', path: '/profile', icon: <CgProfile /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex justify-around items-center w-full max-w-lg mx-auto h-16 px-2">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => {
              const isItemActive = isActive || (item.path === '/reels-feed' && (window.location.pathname === '/reels' || window.location.pathname.startsWith('/reels')));
              return `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isItemActive ? 'text-brand-orange font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
              }`;
            }}
          >
            {item.isAdd ? (
              <div className="w-11 h-11 bg-brand-orange text-white rounded-full flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transform transition">
                {item.icon}
              </div>
            ) : (
              <>
                <span className="relative text-xl mb-0.5">
                  {item.icon}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-brand-orange text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-wider">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;