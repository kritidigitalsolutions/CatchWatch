import React from 'react';
import { FaSearch } from "react-icons/fa";
import { GiSaveArrow } from "react-icons/gi";
import { FaShareNodes } from "react-icons/fa6";
import { LuMessageCircleMore } from "react-icons/lu";
import { FaRegHeart } from "react-icons/fa";
import { FaItunesNote } from "react-icons/fa";

const ShortsPage = () => {
  return (
    <div className="max-w-md mx-auto w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-[9/16] my-2 md:my-6">
      {/* Absolute Transparent Frame Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10 text-white">
        <h1 className="text-xl font-black tracking-wide">Shorts</h1>
        <div className="flex gap-4 text-xl">
          <button className="hover:opacity-80"><FaSearch /></button>
          <button className="hover:opacity-80">⋮</button>
        </div>
      </div>

      {/* Loading Indicator Core */}
      <div className="absolute inset-0 flex flex-col justify-center items-center bg-zinc-950 z-0">
        <div className="w-12 h-12 border-4 border-white/20 border-t-brand-orange rounded-full animate-spin"></div>
        <span className="text-xs text-gray-400 mt-4 tracking-wider">Streaming Video Stream...</span>
      </div>

      {/* Floating System Actions Widget Stack */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-5 items-center z-20 text-white">
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-xl group-hover:bg-white/20"><FaRegHeart /></div>
          <span className="text-xs font-bold mt-1 shadow-sm">0</span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-xl group-hover:bg-white/20"><LuMessageCircleMore /></div>
          <span className="text-xs font-bold mt-1 shadow-sm">0</span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-xl group-hover:bg-white/20"><GiSaveArrow /></div>
          <span className="text-[10px] uppercase font-bold tracking-wide mt-0.5">Save</span>
        </button>
        <button className="flex flex-col items-center group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-xl group-hover:bg-white/20"><FaShareNodes /></div>
          <span className="text-[10px] uppercase font-bold tracking-wide mt-0.5">Share</span>
        </button>
        {/* <div className="w-10 h-10 border-2 border-white bg-brand-orange rounded-full flex items-center justify-center text-[9px] font-black shadow-lg">
          C&W
        </div> */}
      </div>

      {/* Bottom User Description Meta Interface */}
      <div className="absolute bottom-6 left-4 right-20 z-20 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 rounded-xl backdrop-blur-[2px]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-brand-orange flex items-center justify-center font-bold text-sm border border-white/50">G</div>
          <span className="font-bold tracking-wide text-sm sm:text-base">@garima</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-200 font-medium mb-2">Testing reels feed APIs</p>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span><FaItunesNote /></span>
          <span className="truncate bg-white/10 px-2 py-0.5 rounded text-[11px]">Original Audio - CatchWatch Music</span>
        </div>
      </div>
    </div>
  );
};

export default ShortsPage;