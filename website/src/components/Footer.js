import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-neutral-900 text-gray-400 border-t border-neutral-800 mt-auto">
      {/* Upper Data Columns Footer Space */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        
        {/* Brand Information Area Block Component */}
        <div className="space-y-4 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-brand-orange text-white rounded-lg flex items-center justify-center font-black text-xs">
              CW
            </div>
            <span className="text-lg font-extrabold text-white tracking-wide">CATCHWATCH</span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
            The premium video streaming marketplace architecture delivering ultra-high definition playback blocks, cinematic shorts feed sequences, and live media tracking frameworks.
          </p>
        </div>

        {/* Content Portal Routing Column List */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-brand-orange pl-2">
            Explore Feeds
          </h4>
          <ul className="space-y-2.5 text-xs font-medium">
            <li><button onClick={() => navigate('/')} className="hover:text-white transition">All Featured Shows</button></li>
            <li><button onClick={() => navigate('/')} className="hover:text-white transition">Cinematic Movies</button></li>
            <li><button onClick={() => navigate('/shorts')} className="hover:text-white transition">Trending Reel Shorts</button></li>
            <li><button onClick={() => navigate('/')} className="hover:text-white transition">TV Shows Catalog</button></li>
          </ul>
        </div>

        {/* Membership Access Area Column List */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-brand-orange pl-2">
            Membership
          </h4>
          <ul className="space-y-2.5 text-xs font-medium">
            <li><button onClick={() => navigate('/subscription')} className="hover:text-white transition">Subscription Plans</button></li>
            <li><button onClick={() => navigate('/downloads')} className="hover:text-white transition">Local Storage Downloads</button></li>
            <li><button onClick={() => navigate('/profile')} className="hover:text-white transition">My Cloud Profile</button></li>
            <li><button onClick={() => navigate('/profile/edit')} className="hover:text-white transition">Account Matrix Settings</button></li>
          </ul>
        </div>

        {/* Regulatory Governance Compliance Column List */}
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-brand-orange pl-2">
            Legal Compliance
          </h4>
          <ul className="space-y-2.5 text-xs font-medium">
            <li><button className="hover:text-white transition">Terms & Conditions</button></li>
            <li><button className="hover:text-white transition">Refund Policy Guidelines</button></li>
            <li><button className="hover:text-white transition">Privacy Regulation Matrix</button></li>
            <li><button className="hover:text-white transition">Help & Support Desk</button></li>
          </ul>
        </div>

      </div>

      {/* Underline Copyright Metadata Bottom Segment Bar */}
      <div className="w-full bg-neutral-950 border-t border-neutral-900 py-6 text-center text-[11px] text-neutral-600 tracking-wide px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {currentYear} CATCHWATCH Video Streaming Network Services Inc. All Rights Reserved.</span>
          <div className="flex gap-4 text-neutral-500">
            <span className="hover:text-gray-400 cursor-pointer">Security Portal</span>
            <span>•</span>
            <span className="hover:text-gray-400 cursor-pointer">API Integration Pipeline Documentation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;