import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { AlertCircle } from "lucide-react";

// Extract YouTube Video ID
const getYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Resolve Backend Static Path vs Absolute CDN URL
const getFullUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  const apiBase =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
    "http://localhost:5000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${cleanPath}`;
};

export default function AdminVideoPlayer({
  videoUrl,
  item,
  subtitles = [],
  activeSubUrl = "",
  activeSubLang = "",
  activeAudioUrl = "",
  isSecondaryAudio = false,
  className = "admin-video-player",
  style = {},
  autoPlay = false,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [useMp4Fallback, setUseMp4Fallback] = useState(false);

  // Extract raw source URL or Bunny videoId
  const rawUrl = videoUrl || item?.videoUrl || item?.video || item?.trailerUrl || "";
  let vId = item?.videoId || null;

  if (!vId && typeof rawUrl === "string" && (rawUrl.includes("b-cdn.net") || rawUrl.includes("mediadelivery.net"))) {
    const parts = rawUrl.split("/");
    const found = parts.find((p) => p.length >= 32 && (p.includes("-") || p.length === 36));
    if (found) vId = found;
  }

  const ytId = getYouTubeId(rawUrl);

  const apiBase =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
    "http://localhost:5000";

  // Determine HLS and MP4 stream URLs (Routed via Stream Proxy to bypass Referrer blocks)
  let hlsUrl = null;
  let mp4Url = null;

  if (vId) {
    hlsUrl = `${apiBase}/api/stream-proxy/${vId}/playlist.m3u8`;
    mp4Url = `${apiBase}/api/stream-proxy/${vId}/play_720p.mp4`;
  } else if (typeof rawUrl === "string" && rawUrl.includes(".m3u8")) {
    const parts = rawUrl.split("/");
    const found = parts.find((p) => p.length >= 32 && (p.includes("-") || p.length === 36));
    if (found) {
      hlsUrl = `${apiBase}/api/stream-proxy/${found}/playlist.m3u8`;
      mp4Url = `${apiBase}/api/stream-proxy/${found}/play_720p.mp4`;
    } else {
      hlsUrl = rawUrl;
      mp4Url = rawUrl.replace("playlist.m3u8", "play_720p.mp4");
    }
  } else if (rawUrl) {
    mp4Url = getFullUrl(rawUrl);
  }

  // Handle HLS stream initialization & MP4 fallback
  useEffect(() => {
    setErrorMsg(null);
    setUseMp4Fallback(false);

    if (ytId || !videoRef.current) return;

    const videoEl = videoRef.current;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (hlsUrl && !useMp4Fallback) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            videoEl.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.warn("HLS fatal error in AdminVideoPlayer, switching to MP4 fallback:", data);
            hls.destroy();
            hlsRef.current = null;
            if (mp4Url) {
              setUseMp4Fallback(true);
            } else {
              setErrorMsg("Unable to stream video. Please check source.");
            }
          }
        });
      } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Safari HLS
        videoEl.src = hlsUrl;
        if (autoPlay) {
          videoEl.play().catch(() => {});
        }
      } else if (mp4Url) {
        setUseMp4Fallback(true);
      }
    } else if (mp4Url) {
      videoEl.src = mp4Url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, mp4Url, ytId, autoPlay, useMp4Fallback]);

  // Secondary audio sync handler
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !isSecondaryAudio) return;

    const handlePlay = () => audio.play().catch(() => {});
    const handlePause = () => audio.pause();
    const handleSeeked = () => {
      audio.currentTime = video.currentTime;
    };
    const handleTimeUpdate = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.3) {
        audio.currentTime = video.currentTime;
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isSecondaryAudio, activeAudioUrl]);

  // If YouTube, render responsive YouTube Embed
  if (ytId) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`}
          title="Video Preview"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "8px" }}
        />
      </div>
    );
  }

  // If error
  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 text-gray-400 rounded-xl text-center">
        <AlertCircle size={32} className="text-amber-500 mb-2" />
        <p className="text-xs font-semibold">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <video
        ref={videoRef}
        controls
        playsInline
        crossOrigin="anonymous"
        className={className}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#000",
          borderRadius: "8px",
        }}
      >
        {activeSubUrl && (
          <track
            kind="subtitles"
            src={getFullUrl(activeSubUrl)}
            srcLang={activeSubLang?.toLowerCase()?.slice(0, 2) || "en"}
            label={activeSubLang || "Subtitles"}
            default
          />
        )}
        {Array.isArray(subtitles) &&
          subtitles
            .filter((s) => s.fileUrl && s.fileUrl !== activeSubUrl)
            .map((s, idx) => (
              <track
                key={idx}
                kind="subtitles"
                src={getFullUrl(s.fileUrl)}
                srcLang={s.language?.toLowerCase()?.slice(0, 2) || "en"}
                label={s.label || s.language || `Sub ${idx + 1}`}
              />
            ))}
        Your browser does not support HTML5 video.
      </video>

      {/* Secondary Audio Track Element */}
      {isSecondaryAudio && activeAudioUrl && (
        <audio
          ref={audioRef}
          src={getFullUrl(activeAudioUrl)}
          style={{ display: "none" }}
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
}
