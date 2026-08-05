import React, { useState } from 'react';
import { BsCloudUploadFill, BsImage } from "react-icons/bs";
import { FaCamera, FaCloudUploadAlt } from "react-icons/fa";

// Apne API file ka path yahan adjust kar lein
import { uploadReel } from '../api/reelsApi'; 
import LiveCameraRecorder from '../components/LiveCameraRecorder';

const SelectVideoPage = () => {
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'camera'
  const [fileObject, setFileObject] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [autoThumbnailBlob, setAutoThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [caption, setCaption] = useState('');
  
  // UI & Loading States
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Auto-generate thumbnail from selected video file
  const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      setIsGeneratingThumb(true);
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            setIsGeneratingThumb(false);
            if (blob) {
              const previewUrl = canvas.toDataURL('image/jpeg');
              resolve({ blob, previewUrl });
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.85);
        } catch (err) {
          console.error("Thumbnail extraction error:", err);
          URL.revokeObjectURL(url);
          setIsGeneratingThumb(false);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        setIsGeneratingThumb(false);
        resolve(null);
      };
    });
  };

  // Handle Video File Selection & Size Validation
  const handleFileCapture = async (e) => {
    setFeedback({ type: '', message: '' }); // Clear previous errors
    const file = e.target.files[0];
    
    if (file) {
      // 95 MB limit validation (Cloudflare safe limit)
      if (file.size > 99614720) {
        setFeedback({ type: 'error', message: 'File size exceeds the 95MB limit. Please select a smaller video.' });
        setFileObject(null);
        setAutoThumbnailBlob(null);
        setThumbnailPreview(null);
        e.target.value = null; // Reset input
      } else {
        setFileObject(file);
        setThumbnailFile(null);
        
        // Auto extract video thumbnail
        const thumbResult = await generateVideoThumbnail(file);
        if (thumbResult) {
          setAutoThumbnailBlob(thumbResult.blob);
          setThumbnailPreview(thumbResult.previewUrl);
        }
      }
    }
  };

  // Handle Video Recorded via Live Camera
  const handleCameraVideoRecorded = async (recordedFile) => {
    setFeedback({ type: 'success', message: '✓ Live camera video captured successfully!' });
    setFileObject(recordedFile);
    setThumbnailFile(null);
    setUploadMode('file'); // Switch back to editor view to add caption & upload

    // Auto extract video thumbnail from recorded file
    const thumbResult = await generateVideoThumbnail(recordedFile);
    if (thumbResult) {
      setAutoThumbnailBlob(thumbResult.blob);
      setThumbnailPreview(thumbResult.previewUrl);
    }
  };

  // Handle Custom Thumbnail File Selection
  const handleCustomThumbnail = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
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
      formData.append('video', fileObject); 

      // Send thumbnail file (Custom image OR Auto-generated video frame Blob)
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      } else if (autoThumbnailBlob) {
        formData.append('thumbnail', autoThumbnailBlob, 'thumbnail.jpg');
      }

      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      // Call API
      await uploadReel(formData);

      setFeedback({ type: 'success', message: 'Reel uploaded successfully! It will now appear in the feed.' });
      setFileObject(null); // Clear selection after success
      setThumbnailFile(null);
      setAutoThumbnailBlob(null);
      setThumbnailPreview(null);
      setCaption('');

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

        {/* Mode Selector Tabs */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              uploadMode === 'file'
                ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <FaCloudUploadAlt className="text-base" /> Upload
          </button>

          <button
            type="button"
            onClick={() => setUploadMode('camera')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border relative ${
              uploadMode === 'camera'
                ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <FaCamera className="text-sm" /> Camera
            {/* <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase animate-pulse">
              LIVE
            </span> */}
          </button>
        </div>
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

      {/* Main Content Area: Camera Studio or File Selector */}
      {uploadMode === 'camera' ? (
        <div className="my-2">
          <LiveCameraRecorder 
            onVideoRecorded={handleCameraVideoRecorded} 
            onCancel={() => setUploadMode('file')} 
          />
        </div>
      ) : (
        /* Drag & Drop File Container Interface */
        <div className="flex-1 flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-3">
            <label className={`w-full border-2 border-dashed rounded-xl p-8 sm:p-10 text-center flex flex-col items-center justify-center transition-all ${
              isUploading ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-brand-orange hover:bg-brand-light-bg/30 cursor-pointer'
            }`}>
              <input 
                type="file" 
                accept="video/mp4,video/quicktime,video/webm" 
                className="hidden" 
                onChange={handleFileCapture} 
                disabled={isUploading}
              />
              
              <div className="w-14 h-14 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-2xl mb-3 shadow-sm">
                <BsCloudUploadFill />
              </div>
              
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-800">
                {fileObject ? 'Change Selected Video' : 'Select your video'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 mb-3">MP4 · MOV · WEBM • Max size threshold: 95 MB</p>
              
              <div className="flex flex-wrap gap-2 justify-center">
                <div className={`bg-white border text-xs font-bold px-5 py-2 rounded-full transition shadow-sm ${
                  isUploading ? 'border-gray-300 text-gray-400' : 'border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white'
                }`}>
                  Tap to browse gallery
                </div>
              </div>

              {fileObject && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg text-xs text-green-700 font-semibold border border-green-200 max-w-sm truncate w-full">
                  ✓ Ready: {fileObject.name} ({(fileObject.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              )}
            </label>

            {/* Quick Button to Launch Camera */}
            {!fileObject && (
              <div className="text-center">
                <span className="text-xs text-gray-400 font-medium">or</span>
                <button
                  type="button"
                  onClick={() => setUploadMode('camera')}
                  className="mt-2 w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <FaCamera className="text-brand-orange text-sm" /> Record Video directly with Camera
                </button>
              </div>
            )}
          </div>

        {/* Thumbnail Preview & Custom Cover Picker */}
        {fileObject && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-36 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative border shadow-sm">
              {isGeneratingThumb ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-[10px] bg-black/60 p-2 text-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1"></div>
                  Generating...
                </div>
              ) : thumbnailPreview ? (
                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <BsImage className="text-xl" />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Video Cover / Thumbnail</h4>
              <p className="text-xs text-gray-500">
                {thumbnailFile ? 'Custom cover image selected' : 'Auto-captured cover frame from your video'}
              </p>
              
              <label className="cursor-pointer inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs text-brand-orange font-bold hover:underline mt-1">
                <BsImage /> {thumbnailFile ? 'Change custom cover' : 'Upload custom cover image'}
                <input 
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,image/webp" 
                  className="hidden" 
                  onChange={handleCustomThumbnail}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        )}

        {/* Caption Input */}
        {fileObject && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Caption (Optional)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption for your reel..."
              rows={2}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-orange focus:outline-none resize-none"
              disabled={isUploading}
            />
          </div>
        )}
      </div>
      )}

      {/* Submission Panel Block Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <button 
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          onClick={handleUploadSubmit}
          disabled={!fileObject || isUploading || isGeneratingThumb}
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Uploading Payload...
            </>
          ) : (
            'Upload Reel'
          )}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
          By submitting, you comply with video formatting guidelines (Max 95 MB)
        </p>
      </div>
    </div>
  );
};

export default SelectVideoPage;