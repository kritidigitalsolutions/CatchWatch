import React from 'react';
import { useNavigate } from 'react-router-dom';

const DownloadsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
      {/* Structural Segment Header Title */}
      <div className="bg-brand-orange text-white p-5 flex items-center gap-4">
        <button className="text-2xl font-bold cursor-pointer hover:scale-105 transition" onClick={() => navigate('/profile')}>←</button>
        <h1 className="text-base sm:text-lg font-bold tracking-tight">Offline Files Vault</h1>
      </div>

      {/* Meta Analytics Summary Bar Counter Panel */}
      <div className="bg-brand-light-bg/50 border-b border-gray-100 p-4 flex items-center gap-3 text-xs sm:text-sm font-bold text-gray-600">
        <span>📊</span>
        <span>0 individual cache streams validated locally on device storage allocation structures</span>
      </div>

      {/* Centered Presentation Block Segment */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-white">
        <div className="w-20 h-20 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-3xl shadow-sm border border-brand-orange/10 mb-4 animate-bounce">
          📥
        </div>
        <h2 className="text-lg font-black tracking-tight text-gray-800">No Offline Files Found</h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xs mt-1 leading-relaxed">
          Downloaded movie assets, shows, and reel files stored dynamically locally onto device storage arrays appear structured right here.
        </p>
      </div>
    </div>
  );
};

export default DownloadsPage;