import React, { useState } from 'react';
import { BsCloudUploadFill } from "react-icons/bs";

// Apne API file ka path yahan adjust kar lein
import { uploadReel } from '../api/reelsApi'; 

const SelectVideoPage = () => {
  const [fileObject, setFileObject] = useState(null);
  
  // UI & Loading States
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Handle File Selection & Size Validation
  const handleFileCapture = (e) => {
    setFeedback({ type: '', message: '' }); // Clear previous errors
    const file = e.target.files[0];
    
    if (file) {
      // 100 MB limit validation (100 * 1024 * 1024 bytes)
      if (file.size > 104857600) {
        setFeedback({ type: 'error', message: 'File size exceeds the 100MB limit. Please select a smaller video.' });
        setFileObject(null);
        e.target.value = null; // Reset input
      } else {
        setFileObject(file);
      }
    }
  };

  // Handle API Upload
  const handleUploadSubmit = async () => {
    if (!fileObject) {
      setFeedback({ type: 'error', message: 'Please select a video file first.' });
      return;
    }

    setIsUploading(true);
    setFeedback({ type: '', message: '' });

    try {
      // Multipart FormData creation for file upload
      const formData = new FormData();
      
      // Note: 'video' key ka naam aapke backend ki requirement ke hisaab se change karna pad sakta hai 
      // (e.g., formData.append('reel', fileObject) or formData.append('file', fileObject))
      formData.append('video', fileObject); 

      // Call API
      await uploadReel(formData);

      setFeedback({ type: 'success', message: 'Reel uploaded successfully! It will now appear in the feed.' });
      setFileObject(null); // Clear selection after success

    } catch (error) {
      console.error("Upload Error:", error);
      setFeedback({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to upload the reel. Please try again later.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-sm flex flex-col justify-between min-h-[70vh]">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Create Studio Reel</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Publish immersive video blocks to the CatchWatch feed array.</p>
      </div>

      {/* Feedback Message Alert */}
      {feedback.message && (
        <div className={`p-4 rounded-xl text-sm font-bold text-center mb-4 border ${
          feedback.type === 'success' 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Drag & Drop File Container Interface */}
      <div className="flex-1 flex justify-center items-center py-6">
        <label className={`w-full border-2 border-dashed rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-all ${
          isUploading ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-brand-orange hover:bg-brand-light-bg/30 cursor-pointer'
        }`}>
          <input 
            type="file" 
            accept="video/mp4,video/quicktime" 
            className="hidden" 
            onChange={handleFileCapture} 
            disabled={isUploading}
          />
          
          <div className="w-16 h-16 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">
            <BsCloudUploadFill />
          </div>
          
          <h2 className="text-lg font-bold tracking-tight text-gray-800">
            {fileObject ? 'Change Selected Video' : 'Select your video'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 mb-4">MP4 · MOV • Max size threshold: 100 MB</p>
          
          <div className={`bg-white border text-xs font-bold px-5 py-2 rounded-full transition shadow-sm ${
            isUploading ? 'border-gray-300 text-gray-400' : 'border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white'
          }`}>
            Tap to browse gallery
          </div>

          {fileObject && (
            <div className="mt-5 p-3 bg-green-50 rounded-lg text-xs text-green-700 font-semibold border border-green-200 max-w-sm truncate w-full">
              ✓ Ready: {fileObject.name} ({(fileObject.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          )}
        </label>
      </div>

      {/* Submission Panel Block Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <button 
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          onClick={handleUploadSubmit}
          disabled={!fileObject || isUploading}
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Uploading Payload...
            </>
          ) : (
            'Select Reel Payload'
          )}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
          By submitting, you comply with video formatting guidelines (Max 100 MB)
        </p>
      </div>
    </div>
  );
};

export default SelectVideoPage;