import { useState, useRef } from "react";

import "./Dashboard.css";

import MediaAssetsStep from "../features/content/steps/MediaAssetsStep";
import CastSection from "../features/content/cast/CastSection";
import SeasonsSection from "../features/content/seasons/SeasonsSection";
import BasicInfoSection from "../features/content/basic/BasicInfoSection";

import { createContent } from "../features/services/content.service";
import useContentForm from "../features/hooks/useContentForm";

import {
  Plus,
  Film,
  Tv,
  Rocket,
  ChevronRight,
  Trash,
  Check,
} from "lucide-react";

export default function AddContent() {
  const {
    form,
    setForm,

    ch,
    setType,

    addCast,
    removeCast,


    chCast,

    addSeason,
    removeSeason,

    addEp,
    removeEp,
    chEp,

    resetForm,
  } = useContentForm();

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "main", "episodes", "complete"
  const [currentEpisodeInfo, setCurrentEpisodeInfo] = useState({ current: 0, total: 0 });

  // Multilingual Ingestion States
  const [audioTracks, setAudioTracks] = useState([]); // [{ language, file, isDefault }]
  const [selectedAudioLang, setSelectedAudioLang] = useState("Hindi");
  const [audioFile, setAudioFile] = useState(null);
  const [audioIsDefault, setAudioIsDefault] = useState(false);

  const [subtitles, setSubtitles] = useState([]); // [{ language, label, file, isDefault }]
  const [selectedSubLang, setSelectedSubLang] = useState("English");
  const [subLabel, setSubLabel] = useState("English CC");
  const [subFile, setSubFile] = useState(null);
  const [subIsDefault, setSubIsDefault] = useState(false);

  // Mapped episode track files (keyed by "seasonIndex_episodeIndex")
  const [episodeAudioFiles, setEpisodeAudioFiles] = useState({}); // { "0_1": [{ language, file, isDefault }] }
  const [episodeSubtitleFiles, setEpisodeSubtitleFiles] = useState({}); // { "0_1": [{ language, label, file, isDefault }] }

  const audioInputRef = useRef(null);
  const subInputRef = useRef(null);

  const SUPPORTED_LANGUAGES = [
    "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Spanish", "French", "German"
  ];

  const addAudioTrack = () => {
    if (!audioFile) {
      alert("Please select an audio file.");
      return;
    }
    const finalLanguage = selectedAudioLang.trim();
    if (!finalLanguage) {
      alert("Please specify a language name.");
      return;
    }
    if (audioTracks.some((t) => t.language.toLowerCase() === finalLanguage.toLowerCase())) {
      alert(`Audio track for ${finalLanguage} is already added.`);
      return;
    }
    setAudioTracks([
      ...audioTracks,
      {
        language: finalLanguage,
        file: audioFile,
        isDefault: audioIsDefault
      }
    ]);
    setAudioFile(null);
    setAudioIsDefault(false);
    setSelectedAudioLang("Hindi");
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const addSubtitleTrack = () => {
    if (!subFile) {
      alert("Please select a subtitle file (.vtt).");
      return;
    }
    const finalLanguage = selectedSubLang.trim();
    if (!finalLanguage) {
      alert("Please specify a language name.");
      return;
    }
    if (subtitles.some((s) => s.language.toLowerCase() === finalLanguage.toLowerCase())) {
      alert(`Subtitles for ${finalLanguage} are already added.`);
      return;
    }
    setSubtitles([
      ...subtitles,
      {
        language: finalLanguage,
        label: subLabel || `${finalLanguage} Subtitle`,
        file: subFile,
        isDefault: subIsDefault
      }
    ]);
    setSubFile(null);
    setSubLabel("English CC");
    setSubIsDefault(false);
    setSelectedSubLang("English");
    if (subInputRef.current) subInputRef.current.value = "";
  };



  const [videoFile, setVideoFile] =
    useState(null);

  const [posterFile, setPosterFile] =
    useState(null);

  const [bannerFile, setBannerFile] =
    useState(null);

  const [trailerFile, setTrailerFile] =
    useState(null);

  const [
    episodeVideoFiles,
    setEpisodeVideoFiles,
  ] = useState({});

  const [
    episodeThumbnailFiles,
    setEpisodeThumbnailFiles,
  ] = useState({});

  const [castFiles, setCastFiles] =
    useState({});

  // File Input Refs
  const videoInputRef = useRef(null);

  const posterInputRef =
    useRef(null);

  const bannerInputRef =
    useRef(null);

  const trailerInputRef =
    useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";

    if (
      /^(https?:\/\/|data:|blob:|\/\/)/i.test(
        url
      )
    ) {
      return url;
    }

    return url;
  };

  // Upload Handlers
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setVideoFile(file);
    }
  };

  const handlePosterFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setPosterFile(file);
    }
  };

  const handleBannerFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setBannerFile(file);
    }
  };

  const handleTrailerFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setTrailerFile(file);
    }
  };

  const handleEpisodeVideoChange = (
    seasonIndex,
    episodeIndex,
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      const key =
        `${seasonIndex}_${episodeIndex}`;

      setEpisodeVideoFiles(
        (prev) => ({
          ...prev,
          [key]: file,
        })
      );
    }
  };

  const handleEpisodeThumbnailChange =
    (
      seasonIndex,
      episodeIndex,
      e
    ) => {
      const file =
        e.target.files?.[0];

      if (file) {
        const key =
          `${seasonIndex}_${episodeIndex}`;

        setEpisodeThumbnailFiles(
          (prev) => ({
            ...prev,
            [key]: file,
          })
        );
      }
    };

  const handleCastFileChange = (
    index,
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setCastFiles((prev) => ({
        ...prev,
        [index]: file,
      }));
    }
  };

  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  // Submit
 // Submit
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setUploadProgress(0);
  setUploadPhase("main");

  try {
      await createContent({
        form,
        videoFile, posterFile, bannerFile, trailerFile,
        castFiles,
        episodeVideoFiles, episodeThumbnailFiles,
        episodeAudioFiles, episodeSubtitleFiles,
        audioTracks,
        subtitles,

      onTrailerProgress: (percent) => {
        setUploadProgress(percent);
      },

      onVideoProgress: (percent) => {
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadPhase(form.type === "movie" ? "complete" : "episodes");
        }
      },

      onEpisodeProgress: (current, total, percent) => {
        setUploadPhase("episodes");
        setCurrentEpisodeInfo({ current, total });
        setUploadProgress(percent);
        if (current === total && percent === 100) {
          setUploadPhase("complete");
        }
      },                              // ← callback ends here, no reset inside
    });

    alert("Content published successfully! 🚀");

    // ✅ Reset HERE — after await resolves, everything is done
    resetForm();
    setVideoFile(null);
    setPosterFile(null);
    setBannerFile(null);
    setTrailerFile(null);
      setEpisodeVideoFiles({});
      setEpisodeThumbnailFiles({});
      setEpisodeAudioFiles({});
      setEpisodeSubtitleFiles({});
      setCastFiles({});
      setAudioTracks([]);
      setSubtitles([]);
      if (audioInputRef.current) audioInputRef.current.value = "";
      if (subInputRef.current) subInputRef.current.value = "";
    setUploadProgress(0);
    setUploadPhase("");
    setCurrentEpisodeInfo({ current: 0, total: 0 });

  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Error publishing content");
    setUploadProgress(0);
    setUploadPhase("");
  }

  setLoading(false);
};
  

  return (
    <div className="add-content-page">

      {/* Header */}
      <div
        className="pg-header"
        style={{
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="pg-title">
            <Plus
              size={24}
              style={{
                color:
                  "var(--primary)",
              }}
            />

            Publish New Content
          </h1>

          <p className="pg-sub">
            Fill in the details below
            to add a {form.type} to
            the platform
          </p>
        </div>

        <div className="content-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${form.type === "movie"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setType("movie")
            }
          >
            <Film size={18} />
            Movies
          </button>

          <button
            type="button"
            className={`toggle-btn ${form.type === "series"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setType("series")
            }
          >
            <Tv size={18} />
            Web Series
          </button>

          <button
            type="button"
            className={`toggle-btn ${form.type === "tvShow"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setType("tvShow")
            }
          >
            <Tv size={18} />
            TV Shows
          </button>

          <button
            type="button"
            className={`toggle-btn ${form.type === "shortFilm"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setType("shortFilm")
            }
          >
            <Film size={18} />
            Short Films
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >

        <BasicInfoSection
          form={form}
          ch={ch}
        />

        <MediaAssetsStep
          form={form}
          ch={ch}

          posterFile={posterFile}
          posterInputRef={
            posterInputRef
          }
          handlePosterFileChange={
            handlePosterFileChange
          }

          bannerFile={bannerFile}
          bannerInputRef={
            bannerInputRef
          }
          handleBannerFileChange={
            handleBannerFileChange
          }

          trailerFile={trailerFile}
          trailerInputRef={
            trailerInputRef
          }
          handleTrailerFileChange={
            handleTrailerFileChange
          }

          videoFile={videoFile}
          videoInputRef={
            videoInputRef
          }
          handleVideoFileChange={
            handleVideoFileChange
          }

          type={form.type}
          isComingSoon={
            form.isComingSoon
          }
        />

        {(form.type === "movie" || form.type === "shortFilm") && (
          <>
            {/* Secondary Audio Tracks Ingestion */}
            <div style={{ background: "#111827", padding: "24px", borderRadius: "12px", border: "1px solid #1f2937", color: "#fff", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#FF7A1A" }}>Secondary Audio Tracks</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end", background: "#1f2937", padding: "15px", borderRadius: "8px" }}>
                <div style={{ minWidth: "150px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>Language</label>
                  <input
                    type="text"
                    list="audio-languages"
                    value={selectedAudioLang}
                    onChange={(e) => setSelectedAudioLang(e.target.value)}
                    placeholder="Type or select"
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#111827", border: "1px solid #374151", color: "#fff" }}
                  />
                  <datalist id="audio-languages">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>Audio File</label>
                  <input type="file" ref={audioInputRef} onChange={(e) => setAudioFile(e.target.files?.[0])} accept="audio/*" style={{ color: "#fff" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px" }}>
                  <input type="checkbox" id="audioDefault" checked={audioIsDefault} onChange={(e) => setAudioIsDefault(e.target.checked)} />
                  <label htmlFor="audioDefault" style={{ fontSize: "13px", color: "#9ca3af", cursor: "pointer" }}>Is Default</label>
                </div>
                <button type="button" onClick={addAudioTrack} style={{ padding: "8px 16px", background: "#FF7A1A", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>
                  Add Track
                </button>
              </div>

              {audioTracks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {audioTracks.map((track, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 15px", background: "#1f2937", borderRadius: "6px" }}>
                      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                        <span style={{ fontWeight: "600", color: "#fff" }}>{track.language}</span>
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>{track.file.name}</span>
                        {track.isDefault && <span style={{ padding: "2px 8px", background: "#10b981", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>Default</span>}
                      </div>
                      <button type="button" onClick={() => setAudioTracks(audioTracks.filter((_, idx) => idx !== i))} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles Ingestion */}
            <div style={{ background: "#111827", padding: "24px", borderRadius: "12px", border: "1px solid #1f2937", color: "#fff", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#FF7A1A" }}>Subtitles (.vtt files)</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end", background: "#1f2937", padding: "15px", borderRadius: "8px" }}>
                <div style={{ minWidth: "150px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>Language</label>
                  <input
                    type="text"
                    list="subtitle-languages"
                    value={selectedSubLang}
                    onChange={(e) => setSelectedSubLang(e.target.value)}
                    placeholder="Type or select"
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#111827", border: "1px solid #374151", color: "#fff" }}
                  />
                  <datalist id="subtitle-languages">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>Label (e.g. English [CC])</label>
                  <input type="text" value={subLabel} onChange={(e) => setSubLabel(e.target.value)} style={{ padding: "8px", borderRadius: "4px", background: "#111827", border: "1px solid #374151", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>Subtitle File</label>
                  <input type="file" ref={subInputRef} onChange={(e) => setSubFile(e.target.files?.[0])} accept=".vtt" style={{ color: "#fff" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px" }}>
                  <input type="checkbox" id="subDefault" checked={subIsDefault} onChange={(e) => setSubIsDefault(e.target.checked)} />
                  <label htmlFor="subDefault" style={{ fontSize: "13px", color: "#9ca3af", cursor: "pointer" }}>Is Default</label>
                </div>
                <button type="button" onClick={addSubtitleTrack} style={{ padding: "8px 16px", background: "#FF7A1A", border: "none", color: "#fff", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>
                  Add Subtitle
                </button>
              </div>

              {subtitles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {subtitles.map((track, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 15px", background: "#1f2937", borderRadius: "6px" }}>
                      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                        <span style={{ fontWeight: "600", color: "#fff" }}>{track.language}</span>
                        <span style={{ color: "#38bdf8", fontSize: "13px" }}>Label: "{track.label}"</span>
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>{track.file.name}</span>
                        {track.isDefault && <span style={{ padding: "2px 8px", background: "#10b981", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>Default</span>}
                      </div>
                      <button type="button" onClick={() => setSubtitles(subtitles.filter((_, idx) => idx !== i))} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <CastSection
          cast={form.cast}
          castFiles={castFiles}
          addCast={addCast}
          removeCast={removeCast}
          chCast={chCast}
          handleCastFileChange={
            handleCastFileChange
          }
          getFullUrl={getFullUrl}
        />

        <SeasonsSection
          form={form}
          setForm={setForm}

          addSeason={addSeason}
          addEp={addEp}
          removeSeason={removeSeason}

          chEp={chEp}
          removeEp={removeEp}

          episodeVideoFiles={
            episodeVideoFiles
          }

          episodeThumbnailFiles={
            episodeThumbnailFiles
          }

          handleEpisodeVideoChange={
            handleEpisodeVideoChange
          }

          handleEpisodeThumbnailChange={
            handleEpisodeThumbnailChange
          }

          setEpisodeVideoFiles={
            setEpisodeVideoFiles
          }

          setEpisodeThumbnailFiles={
            setEpisodeThumbnailFiles
          }

          episodeAudioFiles={episodeAudioFiles}
          setEpisodeAudioFiles={setEpisodeAudioFiles}
          episodeSubtitleFiles={episodeSubtitleFiles}
          setEpisodeSubtitleFiles={setEpisodeSubtitleFiles}
        />



        {loading && (
          <div
            className="upload-progress-card"
            style={{
              padding: "24px",
              borderRadius: "16px",
              background: "rgba(30, 30, 40, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className="spinner"
                  style={{
                    width: 20,
                    height: 20,
                    border: "3px solid rgba(230, 57, 70, 0.2)",
                    borderTopColor: "var(--primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>
                  {uploadPhase === "main" && (
                    form.type === "movie" ? "Uploading Movie Assets..." : 
                    form.type === "shortFilm" ? "Uploading Short Film Assets..." :
                    form.type === "tvShow" ? "Uploading TV Show Details..." :
                    "Uploading TV Series Details..."
                  )}
                  {uploadPhase === "episodes" && `Uploading Episode ${currentEpisodeInfo.current} of ${currentEpisodeInfo.total}...`}
                  {uploadPhase === "complete" && "Finalizing and Publishing Content..."}
                </span>
              </div>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--primary)" }}>
                {uploadProgress}%
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #e30914 0%, #ff4d5a 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 0 12px rgba(227, 9, 20, 0.5)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8a8b98" }}>
              <span>Please keep this window open until publishing is complete.</span>
              {uploadPhase === "main" && (
                <span>
                  {videoFile || trailerFile ? "Sending media chunks to CDN..." : "Uploading metadata..."}
                </span>
              )}
              {uploadPhase === "episodes" && (
                <span>
                  Season {form.seasons.find((_, i) => {
                    let totalBefore = 0;
                    for (let sIdx = 0; sIdx < i; sIdx++) {
                      totalBefore += form.seasons[sIdx].episodes.length;
                    }
                    return currentEpisodeInfo.current <= totalBefore + form.seasons[i].episodes.length;
                  })?.seasonNumber || 1}
                </span>
              )}
              {uploadPhase === "complete" && <span>Syncing CDN distribution nodes...</span>}
            </div>
          </div>
        )}

        {/* Submit */}
        <div
          className="submit-row"
          style={{
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            className="btn-lg"
            disabled={loading}
            style={{
              minWidth: "240px",
              height: "60px",

              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",

              gap: 12,
            }}
          >
            {loading ? (
              <>
                <div
                  className="spinner"
                  style={{
                    width: 20,
                    height: 20,

                    border:
                      "3px solid rgba(255,255,255,0.3)",

                    borderTopColor:
                      "white",

                    borderRadius: "50%",

                    animation:
                      "spin 1s linear infinite",
                  }}
                />

                <span>
                  Publishing...
                </span>
              </>
            ) : (
              <>
                <Rocket size={20} />

                <span>
                  Publish to Platform
                </span>

                <ChevronRight
                  size={18}
                />
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
