import React from 'react';

const Loader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/60 backdrop-blur-md">
      <div className="relative flex items-center justify-center">
        {/* Outer Pulsing Glow */}
        <div className="absolute w-20 h-20 rounded-full border border-brand-orange/30 animate-ping opacity-25"></div>
        
        {/* Spinning Outer Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-t-brand-orange border-r-transparent border-b-neutral-800 border-l-transparent animate-spin"></div>
        
        {/* Inner Static CatchWatch Branding Element */}
        <div className="absolute text-[10px] font-black text-white tracking-widest select-none uppercase">
          C<span className="text-brand-orange">W</span>
        </div>
      </div>
      
      {/* Loading Text */}
      <p className="mt-4 text-xs font-black tracking-widest text-gray-300 uppercase animate-pulse">
        Loading Stream...
      </p>
    </div>
  );
};

export default Loader;