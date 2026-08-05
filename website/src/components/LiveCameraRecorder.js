import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCamera, 
  FaStop, 
  FaRedo, 
  FaCheck, 
  FaTimes, 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaSync,
  FaMagic,
  FaExpand,
  FaCompress
} from 'react-icons/fa';

const MAX_RECORDING_DURATION = 60; // seconds

// Filter Categories
const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'beauty', name: '✨ Beauty' },
  { id: 'tone', name: '🎨 Tones' },
  { id: 'creative', name: '🎭 Creative' },
];

const FILTERS = [
  // Normal / Default
  { id: 'normal', category: 'tone', name: 'Normal', css: 'none', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },

  // Beauty & Skin Smoothing Effects
  { id: 'beauty_smooth', category: 'beauty', name: '✨ Beauty Glow', css: 'brightness(1.08) contrast(1.02) saturate(1.15) blur(0.4px)', bg: 'linear-gradient(135deg, #ff9a9e, #fecfef)' },
  { id: 'dreamy_bloom', category: 'beauty', name: '🌸 Soft Bloom', css: 'brightness(1.15) contrast(0.92) saturate(1.25) blur(0.7px)', bg: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)' },
  { id: 'vignette_focus', category: 'beauty', name: '🌅 Vignette Focus', css: 'sepia(0.2) contrast(1.25) brightness(1.02) saturate(1.2)', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },

  // Color & Tone Presets
  { id: 'warm', category: 'tone', name: 'Golden Hour', css: 'sepia(0.35) contrast(1.15) brightness(1.05) saturate(1.35)', bg: 'linear-gradient(135deg, #f6d365, #fda085)' },
  { id: 'vintage', category: 'tone', name: 'Vintage 70s', css: 'sepia(0.55) hue-rotate(-15deg) contrast(1.15) saturate(1.2)', bg: 'linear-gradient(135deg, #d4fc79, #96e6a1)' },
  { id: 'noir', category: 'tone', name: 'B&W Noir', css: 'grayscale(1) contrast(1.3) brightness(0.95)', bg: 'linear-gradient(135deg, #434343, #000000)' },
  { id: 'vivid', category: 'tone', name: 'Vivid Pop', css: 'saturate(2.2) contrast(1.25) brightness(1.05)', bg: 'linear-gradient(135deg, #ff0844, #ffb199)' },
  { id: 'cinematic', category: 'tone', name: 'Cinematic', css: 'contrast(1.35) brightness(0.85) saturate(1.15) hue-rotate(190deg)', bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { id: 'sunset_glow', category: 'tone', name: 'Sunset Warmth', css: 'sepia(0.4) contrast(1.2) hue-rotate(-10deg) saturate(1.5)', bg: 'linear-gradient(135deg, #ff7e5f, #feb47b)' },

  // Creative & Fun Effects
  { id: 'vhs_retro', category: 'creative', name: '🎥 VHS Tape 80s', css: 'sepia(0.45) contrast(1.3) hue-rotate(-25deg) saturate(1.4)', bg: 'linear-gradient(135deg, #373b44, #4286f4)' },
  { id: 'cyberpunk', category: 'creative', name: '👾 Cyberpunk', css: 'hue-rotate(170deg) saturate(1.8) contrast(1.25)', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { id: 'hologram', category: 'creative', name: '🔮 Neon Hologram', css: 'invert(0.12) hue-rotate(90deg) contrast(1.5) saturate(2.5)', bg: 'linear-gradient(135deg, #b224ef, #7579ff)' },
  { id: 'thermal', category: 'creative', name: '⚡ Thermal Vision', css: 'invert(0.2) hue-rotate(240deg) saturate(3) contrast(1.4)', bg: 'linear-gradient(135deg, #f857a6, #ff5858)' },
  { id: 'xray', category: 'creative', name: '🌌 X-Ray FX', css: 'invert(0.95) hue-rotate(180deg)', bg: 'linear-gradient(135deg, #000000, #434343)' },
];

const LiveCameraRecorder = ({ onVideoRecorded, onCancel }) => {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'recording' | 'preview'
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [fitMode, setFitMode] = useState('contain'); // 'contain' (no zoom crop) | 'cover' (fill screen)

  const liveVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const canvasRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);
  const selectedFilterRef = useRef(selectedFilter);

  // Keep filter ref updated for animation loop
  useEffect(() => {
    selectedFilterRef.current = selectedFilter;
  }, [selectedFilter]);

  // Detect available video devices
  useEffect(() => {
    const checkDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputCount = devices.filter(device => device.kind === 'videoinput').length;
          setHasMultipleCameras(videoInputCount > 1);
        }
      } catch (err) {
        console.warn("Could not enumerate camera devices:", err);
      }
    };
    checkDevices();
  }, []);

  // Initialize camera stream
  const startCamera = async (currentFacingMode = facingMode) => {
    setErrorMessage('');
    stopCameraStream();

    try {
      const constraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera or Microphone permission was denied. Please allow access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on your device.');
      } else {
        setErrorMessage('Unable to access camera: ' + (err.message || 'Unknown error'));
      }
    }
  };

  // Stop current camera stream tracks
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Start camera on mount, cleanup on unmount
  useEffect(() => {
    if (phase !== 'preview') {
      startCamera(facingMode);
    }

    return () => {
      stopCameraStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Handle Live Video stream assignment
  useEffect(() => {
    if (liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Flip Camera (Front / Back)
  const toggleFacingMode = () => {
    if (phase === 'recording') return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Detect supported MIME types for recording
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Render loop to draw filtered frames to canvas during recording
  const renderCanvasFrame = () => {
    const video = liveVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderCanvasFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Apply selected filter to canvas
    const filterCss = selectedFilterRef.current ? selectedFilterRef.current.css : 'none';
    ctx.filter = filterCss;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    animFrameRef.current = requestAnimationFrame(renderCanvasFrame);
  };

  // Start Recording
  const startRecording = () => {
    if (!stream) {
      setErrorMessage('Camera is not ready. Please try again.');
      return;
    }

    chunksRef.current = [];
    setRecordingTime(0);
    setErrorMessage('');
    setShowFilterPicker(false);

    try {
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      
      let streamToRecord = stream;

      // If filter or front camera mirror is active, capture stream from canvas so filter is baked into video file
      if (selectedFilter.id !== 'normal' || facingMode === 'user') {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvasRef.current = canvas;
        
        renderCanvasFrame();

        const canvasStream = canvas.captureStream(30);
        const videoTrack = canvasStream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        const tracks = [videoTrack];
        if (audioTrack) tracks.push(audioTrack);
        
        streamToRecord = new MediaStream(tracks);
      }

      const mediaRecorder = new MediaRecorder(streamToRecord, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }

        const finalBlob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(finalBlob);
        setRecordedBlob(finalBlob);
        setRecordedBlobUrl(url);
        setPhase('preview');
        stopCameraStream();
      };

      mediaRecorder.start(200);
      setPhase('recording');

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            stopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Recording error:", err);
      setErrorMessage('Failed to start video recording: ' + err.message);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Retake / Discard Recorded Video
  const handleRetake = () => {
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    setRecordedBlob(null);
    setRecordedBlobUrl(null);
    setRecordingTime(0);
    setPhase('idle');
    startCamera(facingMode);
  };

  // Accept and Use Recorded Video File (with clean MIME type to prevent 500 error)
  const handleUseVideo = () => {
    if (!recordedBlob) return;
    
    // Clean base MIME type (strips codecs parameter e.g. "video/webm;codecs=vp9,opus" -> "video/webm")
    const rawType = recordedBlob.type ? recordedBlob.type.split(';')[0].toLowerCase().trim() : 'video/webm';
    const isMp4 = rawType.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const cleanMime = isMp4 ? 'video/mp4' : 'video/webm';

    const fileName = `live_reel_${Date.now()}.${ext}`;
    const videoFile = new File([recordedBlob], fileName, { type: cleanMime });

    onVideoRecorded(videoFile);
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Filter list by selected category
  const filteredList = selectedCategory === 'all' 
    ? FILTERS 
    : FILTERS.filter(f => f.category === selectedCategory);

  return (
    <div className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-between min-h-[480px] sm:min-h-[560px]">
      
      {/* Hidden Canvas for filter rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header Control Overlay */}
      <div className="absolute top-0 inset-x-0 z-30 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse" />
          <span className="text-white text-xs font-extrabold tracking-wider uppercase">
            {phase === 'preview' ? 'Review Reel' : phase === 'recording' ? 'Recording Reel' : 'Live Studio'}
          </span>
          {selectedFilter.id !== 'normal' && (
            <span className="bg-brand-orange/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
              ✨ {selectedFilter.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom / Fit Frame Toggle Button */}
          <button 
            onClick={() => setFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
            className="text-white/80 hover:text-white bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition flex items-center gap-1 text-[11px] font-bold px-3"
            title={fitMode === 'contain' ? "Switch to Fill Screen (Crop)" : "Switch to Fit Frame (No Zoom)"}
          >
            {fitMode === 'contain' ? <FaExpand className="text-xs" /> : <FaCompress className="text-xs" />}
            <span className="hidden sm:inline">{fitMode === 'contain' ? 'Fit' : 'Fill'}</span>
          </button>

          {/* Close Button */}
          <button 
            onClick={onCancel}
            className="text-white/80 hover:text-white bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition"
            title="Close Camera"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>
      </div>

      {/* Main Video Display Container */}
      <div className="relative w-full h-[420px] sm:h-[480px] flex items-center justify-center bg-gray-950 overflow-hidden">
        {errorMessage ? (
          <div className="p-6 text-center text-red-400 max-w-md">
            <FaCamera className="text-4xl mx-auto mb-3 opacity-60 text-red-500" />
            <p className="text-sm font-semibold leading-relaxed mb-4">{errorMessage}</p>
            <button 
              onClick={() => startCamera(facingMode)}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs px-5 py-2.5 rounded-full transition shadow-md"
            >
              Try Again
            </button>
          </div>
        ) : phase === 'preview' ? (
          /* Recorded Video Playback Preview */
          <video 
            ref={previewVideoRef}
            src={recordedBlobUrl}
            controls
            autoPlay
            loop
            playsInline
            className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'} bg-black`}
            style={{ filter: selectedFilter.id !== 'normal' ? selectedFilter.css : 'none' }}
          />
        ) : (
          /* Live Stream Camera Feed with Filter Applied */
          <video 
            ref={liveVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'} ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            } transition-all duration-300`}
            style={{ filter: selectedFilter.css }}
          />
        )}

        {/* Live Recording Timer Overlay */}
        {phase === 'recording' && (
          <div className="absolute top-16 inset-x-0 z-20 flex flex-col items-center justify-center">
            <div className="bg-red-600/90 text-white font-mono text-sm font-bold px-4 py-1 rounded-full shadow-lg flex items-center gap-2 animate-pulse backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              REC {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_DURATION)}
            </div>
            {/* Progress Bar */}
            <div className="w-48 h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-red-500 transition-all duration-300 ease-linear"
                style={{ width: `${(recordingTime / MAX_RECORDING_DURATION) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Instagram-Style Multi-Category Filter Drawer */}
        {showFilterPicker && phase === 'idle' && (
          <div className="absolute bottom-4 inset-x-0 z-30 px-4 py-3 bg-black/85 backdrop-blur-lg flex flex-col gap-2.5 transition-all animate-fade-in border-t border-white/10">
            <div className="flex justify-between items-center px-1">
              <span className="text-white text-xs font-extrabold flex items-center gap-1.5">
                <FaMagic className="text-brand-orange" /> Filters & Effects Studio
              </span>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-full text-[10px] font-bold">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-0.5 rounded-full transition ${
                      selectedCategory === cat.id ? 'bg-brand-orange text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowFilterPicker(false)}
                className="text-white/60 hover:text-white text-xs font-bold px-2 py-0.5"
              >
                Done
              </button>
            </div>

            {/* Filter Swatches Carousel */}
            <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
              {filteredList.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex flex-col items-center gap-1 min-w-[64px] transition ${
                    selectedFilter.id === filter.id ? 'scale-110 opacity-100' : 'opacity-65 hover:opacity-95'
                  }`}
                >
                  <div 
                    className={`w-12 h-12 rounded-full border-2 p-0.5 transition shadow-lg relative ${
                      selectedFilter.id === filter.id ? 'border-brand-orange ring-2 ring-brand-orange/50' : 'border-white/40'
                    }`}
                    style={{ background: filter.bg }}
                  >
                    <div 
                      className="w-full h-full rounded-full bg-gray-800/40 backdrop-blur-[1px]" 
                      style={{ filter: filter.css }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold truncate max-w-[68px] ${
                    selectedFilter.id === filter.id ? 'text-brand-orange' : 'text-white'
                  }`}>
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Toolbar */}
      <div className="w-full bg-gradient-to-t from-black via-black/90 to-transparent p-5 z-20 flex justify-around items-center">
        {phase === 'preview' ? (
          /* Preview Actions: Retake vs Use Video */
          <div className="w-full flex justify-center items-center gap-4 px-4">
            <button 
              onClick={handleRetake}
              className="flex-1 max-w-[160px] bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 backdrop-blur-md transition"
            >
              <FaRedo /> Retake
            </button>

            <button 
              onClick={handleUseVideo}
              className="flex-1 max-w-[200px] bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
            >
              <FaCheck className="text-sm" /> Use Video
            </button>
          </div>
        ) : (
          /* Live Recording Controls */
          <>
            {/* Filter Drawer Toggle Button */}
            <button 
              onClick={() => setShowFilterPicker(!showFilterPicker)}
              disabled={phase === 'recording'}
              className={`p-3 rounded-full text-white backdrop-blur-md transition relative ${
                selectedFilter.id !== 'normal' ? 'bg-brand-orange/90 hover:bg-brand-orange' : 'bg-white/15 hover:bg-white/25'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Instagram Filters & Effects"
            >
              <FaMagic className="text-lg" />
              {selectedFilter.id !== 'normal' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
              )}
            </button>

            {/* Mute Audio Button */}
            <button 
              onClick={toggleMute}
              disabled={phase === 'recording'}
              className={`p-3 rounded-full text-white backdrop-blur-md transition ${
                isMuted ? 'bg-red-600/80 hover:bg-red-600' : 'bg-white/15 hover:bg-white/25'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <FaMicrophoneSlash className="text-lg" /> : <FaMicrophone className="text-lg" />}
            </button>

            {/* Main Shutter / Record Button */}
            {phase === 'recording' ? (
              <button 
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-600 border-4 border-white flex items-center justify-center shadow-xl hover:scale-105 transition transform active:scale-95"
                title="Stop Recording"
              >
                <FaStop className="text-white text-xl" />
              </button>
            ) : (
              <button 
                onClick={startRecording}
                disabled={!stream || !!errorMessage}
                className="w-16 h-16 rounded-full bg-brand-orange border-4 border-white flex items-center justify-center shadow-xl hover:scale-105 transition transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Start Recording Reel"
              >
                <div className="w-6 h-6 rounded-full bg-white" />
              </button>
            )}

            {/* Switch Camera Button (Front / Back) */}
            <button 
              onClick={toggleFacingMode}
              disabled={phase === 'recording' || !hasMultipleCameras}
              className={`p-3 rounded-full text-white backdrop-blur-md transition ${
                hasMultipleCameras ? 'bg-white/15 hover:bg-white/25' : 'bg-white/5 text-white/30 cursor-not-allowed'
              } disabled:opacity-40`}
              title="Flip Camera"
            >
              <FaSync className={`text-lg ${phase === 'recording' ? '' : 'hover:rotate-180 transition duration-300'}`} />
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default LiveCameraRecorder;
