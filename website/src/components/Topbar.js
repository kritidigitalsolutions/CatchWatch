import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaSearch } from "react-icons/fa";
import { FaBell } from "react-icons/fa6";
import { FaRegUserCircle } from "react-icons/fa";



const Topbar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'All Shows', path: '/' },
    { name: 'Movies', path: '/movies' },
    { name: 'Short Films', path: '/shorts' },
    { name: 'TV Shows', path: '/tvshows' },
  ];

  const profileLinks = [
    { name: 'My Profile', path: '/profile' },
    { name: 'Edit Profile', path: '/profile/edit' },
    { name: 'Subscription Plans', path: '/subscription' },
    { name: 'Downloads', path: '/downloads' },
  ];

  return (
    <header className="sticky top-0 w-full bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex justify-between items-center">
        
        {/* Brand Identity Branding Panel Area */}
        <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer group">
          <div className="">
            <img src='logo512.png' height={90} width={90} alt='logo'/>
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
                  isActive ? 'text-brand-orange' : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Action Trigger Panels */}
        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => navigate('/search')} className="text-gray-500 hover:text-brand-orange text-xl p-1 transition">
           <FaSearch />
          </button>
          <button className="text-gray-500 hover:text-brand-orange text-xl p-1 transition mr-2">
            <FaBell />
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="hover:bg-brand-orange/90 text-gray-600 font-bold text-[20px] tracking-wider uppercase py-2.5"
          >
            <FaRegUserCircle />
          </button>
        </div>

        {/* Mobile View Functional Controls Module */}
        <div className="flex md:hidden items-center gap-3">
          <button onClick={() => navigate('/search')} className="text-xl text-gray-600 p-1"><FaSearch /></button>
          <button className="text-xl text-gray-600 p-1"><FaBell /></button>
          
          {/* Menu Drawer Hamburger Button Controller */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-2xl text-gray-700 focus:outline-none p-1 ml-1"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Side Menu/Drawer Panel Backdrop System Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-inner animate-fade-in-down">
          <div className="px-4 py-3 border-b border-gray-50 bg-brand-light-bg/30">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">App Links</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {navLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(link.path); setIsMobileMenuOpen(false); }}
                  className="text-left py-2 px-3 bg-white border border-gray-100 rounded-lg text-xs font-bold text-gray-700 hover:text-brand-orange"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="px-4 py-3 space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Account & Settings</span>
            {profileLinks.map((link, i) => (
              <button
                key={i}
                onClick={() => { navigate(link.path); setIsMobileMenuOpen(false); }}
                className="w-full text-left py-2.5 px-2 text-sm font-semibold text-gray-600 hover:bg-brand-light-bg/50 hover:text-brand-orange rounded-lg block"
              >
                {link.name}
              </button>
            ))}
            <div className="pt-2 border-t border-gray-100 mt-2 pb-2">
              <button 
                onClick={() => { navigate('/subscription'); setIsMobileMenuOpen(false); }} 
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