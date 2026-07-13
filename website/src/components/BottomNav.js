import React from 'react';
import { NavLink } from 'react-router-dom';
import { IoMdHome } from "react-icons/io";
import { TfiVideoClapper } from "react-icons/tfi";
import { IoSearchSharp } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { MdCamera } from "react-icons/md";


const BottomNav = () => {
  const navItems = [
    { name: 'Home', path: '/', icon: <IoMdHome />  },
    { name: 'Short', path: '/shorts', icon: <TfiVideoClapper /> },
    { name: 'Add', path: '/upload', icon: <MdCamera />, isAdd: true },
    { name: 'Search', path: '/search', icon: <IoSearchSharp /> },
    { name: 'Profile', path: '/profile', icon: <CgProfile /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 flex justify-around items-center md:sticky md:top-0 md:bottom-auto md:h-20 md:border-t-0 md:border-b md:shadow-sm px-4 max-w-7xl mx-auto">
      {/* Brand Logo Only Visible on Desktop Header Mode */}
      <div className="hidden md:block text-2xl font-black text-brand-orange tracking-wide cursor-pointer">
        CATCHWATCH
      </div>

      <div className="flex justify-around items-center w-full md:w-auto md:gap-8 lg:gap-12">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center text-xs font-semibold transition-colors ${
                isActive ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {item.isAdd ? (
              <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center text-2xl font-normal shadow-md hover:scale-105 transform transition md:w-11 md:h-11">
                {item.icon}
              </div>
            ) : (
              <>
                <span className="text-xl md:text-2xl mb-0.5">{item.icon}</span>
                <span className="text-[10px] md:text-xs uppercase tracking-wider">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;