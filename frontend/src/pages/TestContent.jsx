import { useState, useEffect, useRef } from "react";
import API, { BASE_URL } from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";
import "./TestContent.css";
import {
  Play, Tv, Smartphone, Laptop, Video, RotateCw, ChevronLeft, Volume2, Maximize,
  Upload, Trash2, Globe, Activity, CheckCircle
} from "lucide-react";

export default function TestContent() {
  const [contentType, setContentType] = useState("movies");
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Device simulation states
  const [deviceType, setDeviceType] = useState("phone-portrait"); // phone-portrait, phone-landscape, desktop
  const [useCors, setUseCors] = useState(true); // Toggle to test video with or without crossOrigin="anonymous"

  // TV/Series episodes state
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  // Player state
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isSecondaryAudio, setIsSecondaryAudio] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState("");
  const [activeAudioLang, setActiveAudioLang] = useState("Default");
  const [activeSubUrl, setActiveSubUrl] = useState("");
  const [activeSubLang, setActiveSubLang] = useState("Off");

  // Track upload inputs
  const [audioLang, setAudioLang] = useState("Hindi");
  const [audioFile, setAudioFile] = useState(null);
  const [audioIsDefault, setAudioIsDefault] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [subLang, setSubLang] = useState("English");
  const [subLabel, setSubLabel] = useState("English CC");
  const [subFile, setSubFile] = useState(null);
  const [subIsDefault, setSubIsDefault] = useState(false);
  const [subProgress, setSubProgress] = useState(0);
  const [uploadingSub, setUploadingSub] = useState(false);

  const audioFileInputRef = useRef(null);
  const subFileInputRef = useRef(null);

  const SUPPORTED_LANGUAGES = [
    "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Spanish", "French", "German", "Japanese"
  ];

  const activeVideoUrl = selectedEpisode ? selectedEpisode.videoUrl : (selectedItem?.videoUrl || selectedItem?.video);
  const isYoutube = getYouTubeId(activeVideoUrl);

  // Fetch items list on mount or when content type changes
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const endpoint =
          contentType === "movies" ? "/admin/movies" :
          contentType === "series" ? "/admin/series" :
          contentType === "tvShows" ? "/admin/tv-shows" :
          "/admin/short-films";

        const res = await API.get(`${endpoint}?page=1&limit=100`);
        const key =
          contentType === "movies" ? "movies" :
          contentType === "series" ? "series" :
          contentType === "tvShows" ? "tvShows" :
          "shortFilms";

        const fetched = res.data[key] || [];
        setItems(fetched);
        
        // Reset player configuration
        setSelectedItem(null);
        setEpisodes([]);
        setSelectedEpisode(null);
        resetPlayer();
      } catch (err) {
        console.error("Failed to load test page data", err);
        setItems([]);
      }
      setLoading(false);
    };

    fetchItems();
  }, [contentType]);

  // Reset player state
  function resetPlayer() {
    setIsSecondaryAudio(false);
    setActiveAudioUrl("");
    setActiveAudioLang("Default");
    setActiveSubUrl("");
    setActiveSubLang("Off");
    setBlobSubUrl("");
  }

  // Fetch episodes if series/TV show is selected
  useEffect(() => {
    if (!selectedItem) return;
    resetPlayer();

    const loadEpisodes = async () => {
      if (contentType === "series" || contentType === "tvShows") {
        try {
          const endpoint =
            contentType === "tvShows"
              ? `/admin/tv-shows-episodes/${selectedItem._id}`
              : `/admin/episodes?seriesId=${selectedItem._id}`;

          const res = await API.get(endpoint);
          const eps = res.data.episodes || [];
          setEpisodes(eps);
          if (eps.length > 0) {
            setSelectedEpisode(eps[0]);
          } else {
            setSelectedEpisode(null);
          }
        } catch (err) {
          console.error("Failed to fetch episodes", err);
          setEpisodes([]);
          setSelectedEpisode(null);
        }
      } else {
        setEpisodes([]);
        setSelectedEpisode(null);
      }
    };

    loadEpisodes();
  }, [selectedItem, contentType]);

  // Player synchronization effect
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (isSecondaryAudio && audio) {
        audio.play().catch((e) => console.log("Audio play deferred:", e));
      }
    };

    const handlePause = () => {
      if (audio) {
        audio.pause();
      }
    };

    const handleSeeking = () => {
      if (isSecondaryAudio && audio) {
        audio.pause();
      }
    };

    const handleSeeked = () => {
      if (isSecondaryAudio && audio) {
        audio.currentTime = video.currentTime;
        if (!video.paused) {
          audio.play().catch((e) => console.log("Audio seeked play error:", e));
        } else {
          audio.pause();
        }
      }
    };

    const handleWaiting = () => {
      if (audio) {
        audio.pause();
      }
    };

    const handlePlaying = () => {
      if (isSecondaryAudio && audio && !video.paused) {
        if (Math.abs(audio.currentTime - video.currentTime) > 0.15 && !audio.seeking) {
          audio.currentTime = video.currentTime;
        }
        audio.play().catch((e) => console.log("Audio playing error:", e));
      }
    };

    const handleRateChange = () => {
      if (isSecondaryAudio && audio) {
        audio.playbackRate = video.playbackRate;
      }
    };

    let syncInterval;
    if (isSecondaryAudio) {
      syncInterval = setInterval(() => {
        if (video && audio && !video.paused && video.readyState >= 3 && !video.seeking && !audio.seeking) {
          const drift = Math.abs(audio.currentTime - video.currentTime);
          if (drift > 0.15) {
            audio.currentTime = video.currentTime;
          }
        }
      }, 250);
    }

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ratechange", handleRateChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ratechange", handleRateChange);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [isSecondaryAudio, activeAudioUrl, selectedItem, selectedEpisode]);

  const [blobSubUrl, setBlobSubUrl] = useState("");

  // Subtitle loader and converter
  useEffect(() => {
    if (!activeSubUrl) {
      setBlobSubUrl("");
      return;
    }

    let active = true;
    let localUrl = "";
    
    const loadSub = async () => {
      try {
        const fullUrl = getFullUrl(activeSubUrl);
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error("Fetch failed");
        let text = await res.text();

        // Convert SRT to VTT on-the-fly if needed
        if (activeSubUrl.toLowerCase().endsWith(".srt")) {
          text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
        }

        const blob = new Blob([text], { type: "text/vtt" });
        localUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobSubUrl(localUrl);
        }
      } catch (err) {
        console.error("Failed to fetch/convert subtitle file", err);
        if (active) {
          setBlobSubUrl(getFullUrl(activeSubUrl));
        }
      }
    };

    loadSub();

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [activeSubUrl]);

  // Force active track to show
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !blobSubUrl) return;

    const showTrack = () => {
      if (video.textTracks && video.textTracks.length > 0) {
        video.textTracks[0].mode = "showing";
      }
    };

    video.addEventListener("loadedmetadata", showTrack);
    showTrack();
    
    return () => {
      video.removeEventListener("loadedmetadata", showTrack);
    };
  }, [blobSubUrl, activeVideoUrl]);

  function getFullUrl(url) {
    if (!url) return "";
    const normalizedUrl = url.replace(/\\/g, "/");
    const isFullUrl = /^(https?:\/\/|data:|blob:|\/\/)/i.test(normalizedUrl);
    if (isFullUrl) return normalizedUrl;

    const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`;
    return `${cleanBase}${cleanPath}`;
  }

  function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  // Upload handlers
  const handleAddAudioTrack = async () => {
    const target = (contentType === "series" || contentType === "tvShows") ? selectedEpisode : selectedItem;
    if (!target) {
      alert("Please select a content item first.");
      return;
    }
    if (!audioFile) {
      alert("Please select an audio file to upload.");
      return;
    }

    setUploadingAudio(true);
    setAudioProgress(0);
    try {
      const type = contentType === "movies" ? "movies" :
        contentType === "series" ? "series" :
        contentType === "tvShows" ? "tvShows" :
        "shortFilms";

      // Upload file directly to BunnyCDN
      const fileUrl = await uploadToBunny(audioFile, type, "others", (progress) => {
        setAudioProgress(progress);
      });

      if (!fileUrl) throw new Error("Upload did not return a valid URL");

      const currentTracks = target.audioTracks || [];
      const updatedTracks = [
        ...currentTracks,
        { language: audioLang, fileUrl, isDefault: audioIsDefault }
      ];

      if (contentType === "movies") {
        await API.patch(`/admin/movies/${selectedItem._id}`, {
          audioMetadata: JSON.stringify(updatedTracks)
        });
        setSelectedItem(prev => ({ ...prev, audioTracks: updatedTracks }));
      } else if (contentType === "shortFilms") {
        await API.patch(`/admin/short-films/${selectedItem._id}`, {
          audioMetadata: JSON.stringify(updatedTracks)
        });
        setSelectedItem(prev => ({ ...prev, audioTracks: updatedTracks }));
      } else if (contentType === "series" || contentType === "tvShows") {
        const epEndpoint = contentType === "tvShows" ? `/admin/tv-shows-episodes/${selectedEpisode._id}` : `/admin/episodes/${selectedEpisode._id}`;
        await API.patch(epEndpoint, {
          audioMetadata: JSON.stringify(updatedTracks)
        });
        setSelectedEpisode(prev => ({ ...prev, audioTracks: updatedTracks }));
        setEpisodes(prev => prev.map(e => e._id === selectedEpisode._id ? { ...e, audioTracks: updatedTracks } : e));
      }

      alert("Audio track uploaded and added successfully!");
      setAudioFile(null);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    } catch (err) {
      console.error("Audio upload failed", err);
      alert(`Failed to add audio track: ${err.message || err}`);
    }
    setUploadingAudio(false);
  };

  const handleDeleteAudioTrack = async (langToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the "${langToDelete}" audio track?`)) return;

    try {
      const target = (contentType === "series" || contentType === "tvShows") ? selectedEpisode : selectedItem;
      const currentTracks = target.audioTracks || [];
      const updatedTracks = currentTracks.filter(t => t.language !== langToDelete);

      if (contentType === "movies") {
        await API.patch(`/admin/movies/${selectedItem._id}`, {
          audioMetadata: JSON.stringify(updatedTracks)
        });
        setSelectedItem(prev => ({ ...prev, audioTracks: updatedTracks }));
      } else if (contentType === "shortFilms") {
        await API.patch(`/admin/short-films/${selectedItem._id}`, {
          audioMetadata: JSON.stringify(updatedTracks)
        });
        setSelectedItem(prev => ({ ...prev, audioTracks: updatedTracks }));
      } else if (contentType === "series" || contentType === "tvShows") {
        const epEndpoint = contentType === "tvShows" ? `/admin/tv-shows-episodes/${selectedEpisode._id}` : `/admin/episodes/${selectedEpisode._id}`;
        await API.patch(epEndpoint, {
          audioMetadata: JSON.stringify(updatedTracks)
        });
        setSelectedEpisode(prev => ({ ...prev, audioTracks: updatedTracks }));
        setEpisodes(prev => prev.map(e => e._id === selectedEpisode._id ? { ...e, audioTracks: updatedTracks } : e));
      }

      alert("Audio track deleted successfully!");
    } catch (err) {
      console.error("Audio deletion failed", err);
      alert(`Failed to delete: ${err.message || err}`);
    }
  };

  const handleAddSubtitleTrack = async () => {
    const target = (contentType === "series" || contentType === "tvShows") ? selectedEpisode : selectedItem;
    if (!target) {
      alert("Please select a content item first.");
      return;
    }
    if (!subFile) {
      alert("Please select a subtitle file to upload.");
      return;
    }

    setUploadingSub(true);
    setSubProgress(0);
    try {
      const type = contentType === "movies" ? "movies" :
        contentType === "series" ? "series" :
        contentType === "tvShows" ? "tvShows" :
        "shortFilms";

      // Upload file directly to BunnyCDN
      const fileUrl = await uploadToBunny(subFile, type, "others", (progress) => {
        setSubProgress(progress);
      });

      if (!fileUrl) throw new Error("Upload did not return a valid URL");

      const currentSubs = target.subtitles || [];
      const updatedSubs = [
        ...currentSubs,
        { language: subLang, label: subLabel, fileUrl, isDefault: subIsDefault }
      ];

      if (contentType === "movies") {
        await API.patch(`/admin/movies/${selectedItem._id}`, {
          subtitleMetadata: JSON.stringify(updatedSubs)
        });
        setSelectedItem(prev => ({ ...prev, subtitles: updatedSubs }));
      } else if (contentType === "shortFilms") {
        await API.patch(`/admin/short-films/${selectedItem._id}`, {
          subtitleMetadata: JSON.stringify(updatedSubs)
        });
        setSelectedItem(prev => ({ ...prev, subtitles: updatedSubs }));
      } else if (contentType === "series" || contentType === "tvShows") {
        const epEndpoint = contentType === "tvShows" ? `/admin/tv-shows-episodes/${selectedEpisode._id}` : `/admin/episodes/${selectedEpisode._id}`;
        await API.patch(epEndpoint, {
          subtitleMetadata: JSON.stringify(updatedSubs)
        });
        setSelectedEpisode(prev => ({ ...prev, subtitles: updatedSubs }));
        setEpisodes(prev => prev.map(e => e._id === selectedEpisode._id ? { ...e, subtitles: updatedSubs } : e));
      }

      alert("Subtitle track uploaded and added successfully!");
      setSubFile(null);
      if (subFileInputRef.current) subFileInputRef.current.value = "";
    } catch (err) {
      console.error("Subtitle upload failed", err);
      alert(`Failed to add subtitle track: ${err.message || err}`);
    }
    setUploadingSub(false);
  };

  const handleDeleteSubtitleTrack = async (langToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the "${langToDelete}" subtitle track?`)) return;

    try {
      const target = (contentType === "series" || contentType === "tvShows") ? selectedEpisode : selectedItem;
      const currentSubs = target.subtitles || [];
      const updatedSubs = currentSubs.filter(s => s.language !== langToDelete);

      if (contentType === "movies") {
        await API.patch(`/admin/movies/${selectedItem._id}`, {
          subtitleMetadata: JSON.stringify(updatedSubs)
        });
        setSelectedItem(prev => ({ ...prev, subtitles: updatedSubs }));
      } else if (contentType === "shortFilms") {
        await API.patch(`/admin/short-films/${selectedItem._id}`, {
          subtitleMetadata: JSON.stringify(updatedSubs)
        });
        setSelectedItem(prev => ({ ...prev, subtitles: updatedSubs }));
      } else if (contentType === "series" || contentType === "tvShows") {
        const epEndpoint = contentType === "tvShows" ? `/admin/tv-shows-episodes/${selectedEpisode._id}` : `/admin/episodes/${selectedEpisode._id}`;
        await API.patch(epEndpoint, {
          subtitleMetadata: JSON.stringify(updatedSubs)
        });
        setSelectedEpisode(prev => ({ ...prev, subtitles: updatedSubs }));
        setEpisodes(prev => prev.map(e => e._id === selectedEpisode._id ? { ...e, subtitles: updatedSubs } : e));
      }

      alert("Subtitle track deleted successfully!");
    } catch (err) {
      console.error("Subtitle deletion failed", err);
      alert(`Failed to delete: ${err.message || err}`);
    }
  };

  const activeTarget = (contentType === "series" || contentType === "tvShows") ? selectedEpisode : selectedItem;

  return (
    <div className="test-content-page">
      <h2>Preview & Upload Sandbox</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "-10px" }}>
        Simulate user playback and upload multilingual audio tracks or subtitle files directly to BunnyCDN.
      </p>

      {/* Control Panel */}
      <div className="test-control-panel">
        <div className="test-control-group">
          <span className="test-label">Type:</span>
          <div className="test-toggle-switch">
            <button className={`test-toggle-btn ${contentType === "movies" ? "active" : ""}`} onClick={() => setContentType("movies")}>Movies</button>
            <button className={`test-toggle-btn ${contentType === "series" ? "active" : ""}`} onClick={() => setContentType("series")}>Series</button>
            <button className={`test-toggle-btn ${contentType === "tvShows" ? "active" : ""}`} onClick={() => setContentType("tvShows")}>TV Shows</button>
            <button className={`test-toggle-btn ${contentType === "shortFilms" ? "active" : ""}`} onClick={() => setContentType("shortFilms")}>Short Films</button>
          </div>
        </div>

        <div className="test-control-group">
          <span className="test-label">Content:</span>
          <select
            className="test-select"
            value={selectedItem?._id || ""}
            onChange={(e) => {
              const matched = items.find(item => item._id === e.target.value);
              setSelectedItem(matched || null);
            }}
          >
            <option value="">-- Choose content to test --</option>
            {items.map((item) => (
              <option key={item._id} value={item._id}>{item.title}</option>
            ))}
          </select>
        </div>

        <div className="test-control-group">
          <span className="test-label">Device Mode:</span>
          <div className="test-toggle-switch">
            <button className={`test-toggle-btn ${deviceType === "phone-portrait" ? "active" : ""}`} onClick={() => setDeviceType("phone-portrait")} title="Phone Portrait"><Smartphone size={16} /></button>
            <button className={`test-toggle-btn ${deviceType === "phone-landscape" ? "active" : ""}`} onClick={() => setDeviceType("phone-landscape")} title="Phone Landscape"><RotateCw size={14} /></button>
            <button className={`test-toggle-btn ${deviceType === "desktop" ? "active" : ""}`} onClick={() => setDeviceType("desktop")} title="Desktop Theater"><Laptop size={16} /></button>
          </div>
        </div>

        <div className="test-control-group">
          <span className="test-label" title="Disabling CORS helps test video files when server headers block crossOrigin requests.">Use CORS:</span>
          <div className="switch-container" onClick={() => setUseCors(!useCors)}>
            <div className={`switch-track ${useCors ? "active" : ""}`}>
              <div className="switch-thumb" />
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{useCors ? "ON" : "OFF"}</span>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="test-preview-container">
        {selectedItem ? (
          deviceType.startsWith("phone") ? (
            <div className={`phone-mockup ${deviceType === "phone-landscape" ? "landscape" : ""}`}>
              <div className="phone-notch" />
              <div className="phone-screen">
                {/* Simulated Phone Status Bar */}
                <div style={{ height: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 0 16px", fontSize: "0.65rem", fontWeight: "bold", background: "#000", zIndex: 10 }}>
                  <span>9:41</span>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <span>5G</span>
                    <Volume2 size={10} />
                  </div>
                </div>

                <div className="watch-app-header">
                  <ChevronLeft size={18} style={{ marginRight: "10px" }} /> Watch Screen
                </div>

                {/* Video Player */}
                {activeVideoUrl ? (
                  <div className="watch-video-container view-video-section">
                    {isYoutube ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${isYoutube}`}
                        title="YouTube Player"
                        frameBorder="0"
                        allowFullScreen
                        className="watch-video-element"
                      />
                    ) : (
                      <>
                        <video
                          key={`${activeVideoUrl}_${blobSubUrl}`}
                          ref={videoRef}
                          controls
                          autoPlay
                          className="watch-video-element"
                          src={getFullUrl(activeVideoUrl)}
                          crossOrigin={useCors ? "anonymous" : undefined}
                          onLoadedMetadata={(e) => {
                            const track = e.target.textTracks[0];
                            if (track) track.mode = "showing";
                          }}
                        >
                          {blobSubUrl && (
                            <track
                              kind="subtitles"
                              src={blobSubUrl}
                              srcLang={activeSubLang.toLowerCase().slice(0, 2)}
                              label={activeSubLang}
                              default
                            />
                          )}
                          Your browser does not support video.
                        </video>
                        {isSecondaryAudio && activeAudioUrl && (
                          <audio
                            ref={audioRef}
                            src={getFullUrl(activeAudioUrl)}
                            style={{ display: "none" }}
                            crossOrigin="anonymous"
                          />
                        )}

                        {/* Controls Overlay Inside Video */}
                        <div className="custom-player-overlay">
                          <div className="player-overlay-group">
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <label style={{ fontSize: "8px", color: "#d1d5db", fontWeight: "bold", textTransform: "uppercase" }}>Audio</label>
                              <select
                                value={activeAudioLang}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const video = videoRef.current;
                                  const tracksList = selectedEpisode ? selectedEpisode.audioTracks : selectedItem?.audioTracks;
                                  if (val === "Default") {
                                    setIsSecondaryAudio(false);
                                    setActiveAudioUrl("");
                                    setActiveAudioLang("Default");
                                    if (video) video.muted = false;
                                  } else {
                                    const track = tracksList?.find((t) => t.language === val);
                                    if (track) {
                                      setIsSecondaryAudio(true);
                                      setActiveAudioUrl(track.fileUrl);
                                      setActiveAudioLang(track.language);
                                      if (video) video.muted = true;
                                      setTimeout(() => {
                                        if (audioRef.current && video) {
                                          audioRef.current.currentTime = video.currentTime;
                                          if (!video.paused) audioRef.current.play().catch(e => console.log(e));
                                        }
                                      }, 100);
                                    }
                                  }
                                }}
                                style={{ padding: "2px 4px", borderRadius: "3px", background: "rgba(17, 24, 39, 0.85)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#fff", fontSize: "10px", outline: "none", cursor: "pointer", minWidth: "90px" }}
                              >
                                <option value="Default">Default</option>
                                {((selectedEpisode ? selectedEpisode.audioTracks : selectedItem?.audioTracks) || []).map((track, i) => (
                                  <option key={i} value={track.language}>{track.language}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <label style={{ fontSize: "8px", color: "#d1d5db", fontWeight: "bold", textTransform: "uppercase" }}>Subtitles</label>
                              <select
                                value={activeSubLang}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const subtitleList = selectedEpisode ? selectedEpisode.subtitles : selectedItem?.subtitles;
                                  if (val === "Off") {
                                    setActiveSubUrl("");
                                    setBlobSubUrl(null);
                                    setActiveSubLang("Off");
                                  } else {
                                    const track = subtitleList?.find((s) => s.language === val);
                                    if (track) {
                                      setActiveSubUrl(track.fileUrl);
                                      setActiveSubLang(track.language);
                                      // If it's a file object (local test), create blob
                                      if (track.file instanceof File) {
                                        setBlobSubUrl(URL.createObjectURL(track.file));
                                      } else {
                                        setBlobSubUrl(null);
                                      }
                                    }
                                  }
                                }}
                                style={{ padding: "2px 4px", borderRadius: "3px", background: "rgba(17, 24, 39, 0.85)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#fff", fontSize: "10px", outline: "none", cursor: "pointer", minWidth: "90px" }}
                              >
                                <option value="Off">Off</option>
                                {((selectedEpisode ? selectedEpisode.subtitles : selectedItem?.subtitles) || []).map((track, i) => (
                                  <option key={i} value={track.language}>{track.label || track.language}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button
                            className="btn btn-primary"
                            onClick={() => videoRef.current?.requestPictureInPicture?.()}
                            style={{ padding: "2px 6px", fontSize: "9px", display: "flex", alignItems: "center", gap: "2px", background: "#FF7A1A", border: "none", height: "20px", marginTop: "9px" }}
                          >
                            <Tv size={10} /> PiP
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: "40px 20px", textAlign: "center", background: "#000" }}>
                    <Video size={36} style={{ color: "#94a3b8" }} />
                    <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "10px" }}>No video URL uploaded.</p>
                  </div>
                )}

                {/* Details under Video */}
                <div className="watch-content-details">
                  <h3 className="watch-title">{selectedEpisode ? `E${selectedEpisode.episodeNumber}: ${selectedEpisode.title}` : selectedItem.title}</h3>
                  <div className="watch-metadata">
                    <span className="watch-meta-tag">{selectedItem.releaseYear || 2026}</span>
                    <span className="watch-meta-tag">{selectedEpisode ? selectedEpisode.duration : selectedItem.duration}</span>
                    <span className="watch-meta-tag">★ {selectedItem.rating || 0}</span>
                    <span className="watch-meta-tag">{selectedItem.language}</span>
                  </div>
                  <p className="watch-description">{selectedEpisode ? selectedEpisode.description : selectedItem.description}</p>
                </div>

                {/* Season/Episode selector */}
                {(contentType === "series" || contentType === "tvShows") && episodes.length > 0 && (
                  <div className="watch-episodes-section">
                    <div className="watch-episodes-title">Episodes ({episodes.length})</div>
                    {episodes.map((ep) => (
                      <div
                        key={ep._id}
                        className={`watch-episode-card ${selectedEpisode?._id === ep._id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedEpisode(ep);
                          resetPlayer();
                        }}
                      >
                        <img src={getFullUrl(ep.thumbnail || selectedItem.poster)} alt="Thumb" className="watch-episode-thumb" />
                        <div className="watch-episode-info">
                          <span className="watch-episode-name">S{ep.seasonNumber} E{ep.episodeNumber}: {ep.title}</span>
                          <span className="watch-episode-duration">{ep.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Desktop View */
            <div className="desktop-preview">
              <div className="desktop-body">
                <div style={{ background: "#000", position: "relative" }}>
                  {activeVideoUrl ? (
                    <div className="view-video-section" style={{ width: "100%", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                      {isYoutube ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${isYoutube}`}
                          title="YouTube Desktop Player"
                          frameBorder="0"
                          allowFullScreen
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                        />
                      ) : (
                        <>
                          <video
                            key={`${activeVideoUrl}_${blobSubUrl}`}
                            ref={videoRef}
                            controls
                            autoPlay
                            src={getFullUrl(activeVideoUrl)}
                            crossOrigin={useCors ? "anonymous" : undefined}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                            onLoadedMetadata={(e) => {
                              const track = e.target.textTracks[0];
                              if (track) track.mode = "showing";
                            }}
                          >
                            {blobSubUrl && (
                              <track
                                kind="subtitles"
                                src={blobSubUrl}
                                srcLang={activeSubLang.toLowerCase().slice(0, 2)}
                                label={activeSubLang}
                                default
                              />
                            )}
                          </video>
                          {isSecondaryAudio && activeAudioUrl && (
                            <audio
                              ref={audioRef}
                              src={getFullUrl(activeAudioUrl)}
                              style={{ display: "none" }}
                              crossOrigin="anonymous"
                            />
                          )}

                          {/* Controls Overlay Inside Video */}
                          <div className="custom-player-overlay">
                            <div className="player-overlay-group">
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <label style={{ fontSize: "9px", color: "#d1d5db", fontWeight: "bold", textTransform: "uppercase" }}>Audio Track</label>
                                <select
                                  value={activeAudioLang}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const video = videoRef.current;
                                    const tracksList = selectedEpisode ? selectedEpisode.audioTracks : selectedItem?.audioTracks;
                                    if (val === "Default") {
                                      setIsSecondaryAudio(false);
                                      setActiveAudioUrl("");
                                      setActiveAudioLang("Default");
                                      if (video) video.muted = false;
                                    } else {
                                      const track = tracksList?.find((t) => t.language === val);
                                      if (track) {
                                        setIsSecondaryAudio(true);
                                        setActiveAudioUrl(track.fileUrl);
                                        setActiveAudioLang(track.language);
                                        if (video) video.muted = true;
                                        setTimeout(() => {
                                          if (audioRef.current && video) {
                                            audioRef.current.currentTime = video.currentTime;
                                            if (!video.paused) audioRef.current.play().catch(e => console.log(e));
                                          }
                                        }, 100);
                                      }
                                    }
                                  }}
                                  style={{ padding: "4px 8px", borderRadius: "4px", background: "rgba(17, 24, 39, 0.85)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", minWidth: "130px" }}
                                >
                                  <option value="Default">Default (Video Audio)</option>
                                  {((selectedEpisode ? selectedEpisode.audioTracks : selectedItem?.audioTracks) || []).map((track, i) => (
                                    <option key={i} value={track.language}>{track.language}</option>
                                  ))}
                                </select>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <label style={{ fontSize: "9px", color: "#d1d5db", fontWeight: "bold", textTransform: "uppercase" }}>Subtitles</label>
                                <select
                                  value={activeSubLang}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const subtitleList = selectedEpisode ? selectedEpisode.subtitles : selectedItem?.subtitles;
                                    if (val === "Off") {
                                      setActiveSubUrl("");
                                      setActiveSubLang("Off");
                                    } else {
                                      const track = subtitleList?.find((s) => s.language === val);
                                      if (track) {
                                        setActiveSubUrl(track.fileUrl);
                                        setActiveSubLang(track.language);
                                      }
                                    }
                                  }}
                                  style={{ padding: "4px 8px", borderRadius: "4px", background: "rgba(17, 24, 39, 0.85)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", minWidth: "130px" }}
                                >
                                  <option value="Off">Off</option>
                                  {((selectedEpisode ? selectedEpisode.subtitles : selectedItem?.subtitles) || []).map((track, i) => (
                                    <option key={i} value={track.language}>{track.label || track.language}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <button
                              className="btn btn-primary"
                              onClick={() => videoRef.current?.requestPictureInPicture?.()}
                              style={{ padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", background: "#FF7A1A", border: "none", height: "26px", marginTop: "11px", margin: 0 }}
                            >
                              <Tv size={13} /> PiP
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8" }}>
                      <Video size={48} />
                      <p style={{ marginTop: "10px" }}>No video URL uploaded.</p>
                    </div>
                  )}
                </div>

                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px", maxHeight: "540px", overflowY: "auto" }}>
                  <div>
                    <h3 style={{ fontSize: "1.4rem", color: "#fff", fontWeight: "bold" }}>{selectedEpisode ? `E${selectedEpisode.episodeNumber}: ${selectedEpisode.title}` : selectedItem.title}</h3>
                    <div style={{ display: "flex", gap: "10px", margin: "10px 0", fontSize: "0.8rem", color: "var(--text-soft)" }}>
                      <span>Year: {selectedItem.releaseYear}</span>
                      <span>•</span>
                      <span>Duration: {selectedEpisode ? selectedEpisode.duration : selectedItem.duration}</span>
                      <span>•</span>
                      <span>Rating: {selectedItem.rating}</span>
                    </div>
                    <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedEpisode ? selectedEpisode.description : selectedItem.description}</p>
                  </div>

                  {/* Season/Episode selector */}
                  {(contentType === "series" || contentType === "tvShows") && episodes.length > 0 && (
                    <div style={{ borderTop: "1px solid #334155", paddingTop: "15px" }}>
                      <h4 style={{ color: "#fff", marginBottom: "10px" }}>Episodes List</h4>
                      {episodes.map((ep) => (
                        <div
                          key={ep._id}
                          style={{
                            display: "flex",
                            gap: "12px",
                            padding: "10px",
                            background: selectedEpisode?._id === ep._id ? "rgba(255, 122, 26, 0.15)" : "#1e293b",
                            border: selectedEpisode?._id === ep._id ? "1px solid #FF7A1A" : "1px solid transparent",
                            borderRadius: "8px",
                            marginBottom: "8px",
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            setSelectedEpisode(ep);
                            resetPlayer();
                          }}
                        >
                          <img src={getFullUrl(ep.thumbnail || selectedItem.poster)} alt="ep-thumb" style={{ width: "80px", aspectRatio: "16/9", borderRadius: "4px", objectFit: "cover" }} />
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#fff" }}>S{ep.seasonNumber} E{ep.episodeNumber}: {ep.title}</span>
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>{ep.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
            <Play size={40} style={{ color: "var(--primary)" }} />
            <span>Select content from the dropdown at the top to begin testing.</span>
          </div>
        )}
      </div>

      {/* Multilingual Upload Sandbox Panel */}
      {selectedItem && (
        <div className="upload-sandbox-container">
          {/* Audio Tracks Sandbox */}
          <div className="sandbox-card">
            <div className="sandbox-card-title">
              <Volume2 size={18} style={{ color: "var(--primary)" }} />
              <span>Add Audio Track (Secondary language)</span>
            </div>

            <div className="sandbox-form-row">
              <label className="test-label">Select Language</label>
              <select className="test-select" value={audioLang} onChange={e => setAudioLang(e.target.value)} style={{ minWidth: "100%" }}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="sandbox-form-row">
              <label className="test-label">Choose Audio File</label>
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                className="sandbox-input"
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="sandbox-form-row">
              <label className="test-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", textTransform: "none" }}>
                <input type="checkbox" checked={audioIsDefault} onChange={e => setAudioIsDefault(e.target.checked)} />
                <span>Mark as Default Track</span>
              </label>
            </div>

            <button
              className="btn btn-primary"
              disabled={uploadingAudio || !audioFile}
              onClick={handleAddAudioTrack}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px" }}
            >
              {uploadingAudio ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  <span>Uploading to Bunny ({audioProgress}%)</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload & Save Audio Track</span>
                </>
              )}
            </button>

            {uploadingAudio && (
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${audioProgress}%` }} />
              </div>
            )}

            {/* Existing Audio Tracks */}
            <div style={{ marginTop: "15px" }}>
              <div className="test-label" style={{ borderBottom: "1px solid #334155", paddingBottom: "4px", marginBottom: "8px" }}>Currently Configured Audios</div>
              {activeTarget?.audioTracks && activeTarget.audioTracks.length > 0 ? (
                <div className="sandbox-track-list">
                  {activeTarget.audioTracks.map((track, i) => (
                    <div key={i} className="sandbox-track-item">
                      <span><strong>{track.language}</strong> {track.isDefault && <span style={{ color: "#10b981", fontSize: "10px", marginLeft: "4px" }}>(Default)</span>}</span>
                      <button
                        onClick={() => handleDeleteAudioTrack(track.language)}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="Delete track"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No secondary audio tracks.</span>
              )}
            </div>
          </div>

          {/* Subtitles Sandbox */}
          <div className="sandbox-card">
            <div className="sandbox-card-title">
              <Globe size={18} style={{ color: "var(--primary)" }} />
              <span>Add Subtitle Track</span>
            </div>

            <div className="sandbox-form-row">
              <label className="test-label">Select Language</label>
              <select className="test-select" value={subLang} onChange={e => setSubLang(e.target.value)} style={{ minWidth: "100%" }}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="sandbox-form-row">
              <label className="test-label">Label (e.g. English CC)</label>
              <input
                type="text"
                className="sandbox-input"
                value={subLabel}
                onChange={e => setSubLabel(e.target.value)}
                placeholder="Subtitle Label"
              />
            </div>

            <div className="sandbox-form-row">
              <label className="test-label">Choose Subtitle File (.vtt or .srt)</label>
              <input
                ref={subFileInputRef}
                type="file"
                accept=".vtt,.srt"
                className="sandbox-input"
                onChange={e => setSubFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="sandbox-form-row">
              <label className="test-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", textTransform: "none" }}>
                <input type="checkbox" checked={subIsDefault} onChange={e => setSubIsDefault(e.target.checked)} />
                <span>Mark as Default CC</span>
              </label>
            </div>

            <button
              className="btn btn-primary"
              disabled={uploadingSub || !subFile}
              onClick={handleAddSubtitleTrack}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px" }}
            >
              {uploadingSub ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  <span>Uploading to Bunny ({subProgress}%)</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload & Save Subtitle Track</span>
                </>
              )}
            </button>

            {uploadingSub && (
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${subProgress}%` }} />
              </div>
            )}

            {/* Existing Subtitles */}
            <div style={{ marginTop: "15px" }}>
              <div className="test-label" style={{ borderBottom: "1px solid #334155", paddingBottom: "4px", marginBottom: "8px" }}>Currently Configured Subtitles</div>
              {activeTarget?.subtitles && activeTarget.subtitles.length > 0 ? (
                <div className="sandbox-track-list">
                  {activeTarget.subtitles.map((track, i) => (
                    <div key={i} className="sandbox-track-item">
                      <span><strong>{track.language}</strong> ({track.label}) {track.isDefault && <span style={{ color: "#10b981", fontSize: "10px", marginLeft: "4px" }}>(Default)</span>}</span>
                      <button
                        onClick={() => handleDeleteSubtitleTrack(track.language)}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="Delete track"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No subtitles configured.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}