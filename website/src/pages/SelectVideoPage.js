import React, { useState } from 'react';

const SelectVideoPage = () => {
  const [fileObject, setFileObject] = useState(null);

  const handleFileCapture = (e) => {
    if (e.target.files[0]) {
      setFileObject(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-sm flex flex-col justify-between min-h-[70vh]">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Create Studio Reel</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Publish immersive video blocks to the CatchWatch feed array.</p>
      </div>

      {/* Drag & Drop File Container Interface */}
      <div className="flex-1 flex justify-center items-center py-6">
        <label className="w-full border-2 border-dashed border-brand-orange hover:bg-brand-light-bg/30 rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all">
          <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleFileCapture} />
          
          <div className="w-16 h-16 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">
            ☁️
          </div>
          
          <h2 className="text-lg font-bold tracking-tight text-gray-800">
            {fileObject ? 'Change Selected Video' : 'Select your video'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 mb-4">MP4 · MOV • Max size threshold: 100 MB</p>
          
          <div className="bg-white border border-brand-orange text-brand-orange px-5 py-2 rounded-full text-xs font-bold hover:bg-brand-orange hover:text-white transition shadow-sm">
            Tap to browse gallery
          </div>

          {fileObject && (
            <div className="mt-5 p-3 bg-green-50 rounded-lg text-xs text-green-700 font-semibold border border-green-200 max-w-sm truncate">
              ✓ Ready: {fileObject.name} ({(fileObject.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          )}
        </label>
      </div>

      {/* Submission Panel Block Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <button 
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition disabled:opacity-50"
          onClick={() => alert(fileObject ? 'Uploading Payload Matrix Request...' : 'Choose a video payload file.')}
        >
          Select Reel Payload
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
          By submitting, you comply with video formatting guidelines (Max 100 MB)
        </p>
      </div>
    </div>
  );
};

export default SelectVideoPage;