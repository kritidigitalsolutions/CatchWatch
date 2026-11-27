import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Hls from "hls.js";
import {
  FaPlay,
  FaEye,
  FaSearch,
  FaShareAlt,
  FaCalendarAlt,
  FaCheck,
} from "react-icons/fa";
import { MdLiveTv } from "react-icons/md";
import {
  getActiveLiveShows,
  getFeaturedLiveShow,
  getLiveShowDetails,
  pingLiveShowViewer,
} from "../api/liveShowApi";
import "./LiveShowsPage.css";

const CATEGORIES = [
  "ALL",
  "Music Concert",
  "Podcast",
  "Entertainment",
  "Talk Show",
  "Comedy",
  "Award Show",
  "Gaming",
  "Special Event",
  "News & Info",
];

export default function LiveShowsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data states
  const [shows, setShows] = useState([]);
  const [activeShow, setActiveShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);

  // Video Ref
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Fetch all shows
  const fetchShows = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getActiveLiveShows(params);
      if (res && res.data) {
        setShows(res.data.shows || []);
      }
    } catch (err) {
      console.error("fetchShows error:", err);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  // Initial load: Fetch specific show by ID or Featured show
  useEffect(() => {
    let isMounted = true;
    const loadInitialShow = async () => {
      setLoading(true);
      setError(null);
      try {
        if (id) {
          const detailRes = await getLiveShowDetails(id);
          if (isMounted && detailRes?.data) {
            setActiveShow(detailRes.data);
          }
        } else {
          const featuredRes = await getFeaturedLiveShow();
          if (isMounted && featuredRes?.data) {
            setActiveShow(featuredRes.data);
          }
        }
        await fetchShows();
      } catch (err) {
        console.error("loadInitialShow error:", err);
        if (isMounted) setError("Failed to load live stream");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialShow();
    return () => {
      isMounted = false;
    };
  }, [id, fetchShows]);

  // Handle stream player attachment (HLS / MP4)
  useEffect(() => {
    if (!activeShow) return;

    const streamUrl = activeShow.streamUrl || "";
    const isYouTube =
      activeShow.resolvedStreamType === "youtube" ||
      Boolean(activeShow.youtubeVideoId) ||
      streamUrl.includes("youtube.com") ||
      streamUrl.includes("youtu.be");

    if (isYouTube) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl || !streamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (streamUrl.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoEl.play().catch(() => {});
        });
        hlsRef.current = hls;
      } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        videoEl.src = streamUrl;
        videoEl.addEventListener("loadedmetadata", () => {
          videoEl.play().catch(() => {});
        });
      }
    } else {
      videoEl.src = streamUrl;
      videoEl.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeShow]);

  // Periodic Viewer Heartbeat (every 25 seconds)
  useEffect(() => {
    if (!activeShow?._id) return;

    pingLiveShowViewer(activeShow._id);
    const interval = setInterval(() => {
      pingLiveShowViewer(activeShow._id);
    }, 25000);

    return () => clearInterval(interval);
  }, [activeShow?._id]);

  // Select Show to Play
  const handleSelectShow = (show) => {
    setActiveShow(show);
    navigate(`/live-shows/${show._id}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Share Stream
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: activeShow?.title || "CatchWatch Live Show",
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Helper for YouTube embed ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
    );
    return match ? match[1] : null;
  };

  const isCurrentYouTube =
    activeShow &&
    (activeShow.resolvedStreamType === "youtube" ||
      Boolean(activeShow.youtubeVideoId) ||
      (activeShow.streamUrl &&
        (activeShow.streamUrl.includes("youtube.com") ||
          activeShow.streamUrl.includes("youtu.be"))));

  const ytVideoId =
    activeShow?.youtubeVideoId || (activeShow ? getYouTubeId(activeShow.streamUrl) : null);

  return (
    <div className="live-shows-page">
      {loading && !activeShow && (
        <div style={{ padding: "4rem 1rem", textAlign: "center", color: "#94a3b8" }}>
          <div className="lsp-live-pulse" style={{ margin: "0 auto 1rem auto", width: "16px", height: "16px", background: "#f97316" }} />
          <p>Loading live stream...</p>
        </div>
      )}
      {error && !activeShow && !loading && (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#f87171" }}>
          <p>{error}</p>
        </div>
      )}
      {/* ── Active Live Stream Player Hero ── */}
      {activeShow && (
        <section className="lsp-stage">
          <div className="lsp-stage-inner">
            <div className="lsp-player-wrapper">
              {/* Live Badge Overlay */}
              <div className="lsp-player-top-overlay">
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {activeShow.status === "LIVE" && (
                    <span className="lsp-live-pill">
                      <span className="lsp-live-pulse" /> LIVE STREAM
                    </span>
                  )}
                  {activeShow.status === "UPCOMING" && (
                    <span className="lsp-live-pill" style={{ background: "#f59e0b" }}>
                      UPCOMING
                    </span>
                  )}
                  {activeShow.status === "ENDED" && (
                    <span className="lsp-live-pill" style={{ background: "#64748b" }}>
                      REPLAY
                    </span>
                  )}
                </div>

                <div className="lsp-viewers-pill">
                  <FaEye /> <span>{activeShow.viewersCount || 1} watching</span>
                </div>
              </div>

              {/* Player Video / YouTube Embed */}
              {isCurrentYouTube && ytVideoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&rel=0&modestbranding=1`}
                  title={activeShow.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  poster={activeShow.banner || activeShow.thumbnail}
                />
              )}
            </div>

            {/* Meta Bar below player */}
            <div className="lsp-meta-bar">
              <div className="lsp-meta-tags">
                <span className="lsp-tag-category">{activeShow.category || "Live Show"}</span>
                <span className="lsp-tag-format">
                  {activeShow.resolvedStreamType || activeShow.streamType || "HLS"}
                </span>
                {activeShow.scheduledStartTime && (
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <FaCalendarAlt /> {new Date(activeShow.scheduledStartTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <h1 className="lsp-meta-title">{activeShow.title}</h1>
                <button
                  onClick={handleShare}
                  className="lsp-watch-btn"
                  style={{ cursor: "pointer", flexShrink: 0 }}
                  title="Share Live Stream"
                >
                  {copiedShare ? <FaCheck style={{ color: "#10b981" }} /> : <FaShareAlt />}
                  <span>{copiedShare ? "Copied Link" : "Share"}</span>
                </button>
              </div>

              {activeShow.description && <p className="lsp-meta-desc">{activeShow.description}</p>}
            </div>
          </div>
        </section>
      )}

      {/* ── Content & Listings Section ── */}
      <div className="lsp-content-container">
        {/* Filters & Tabs */}
        <div className="lsp-filter-bar">
          <div className="lsp-tabs">
            {["ALL", "LIVE", "UPCOMING", "ENDED"].map((st) => (
              <button
                key={st}
                className={`lsp-tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "LIVE" && <span className="lsp-live-pulse" />}
                {st === "ALL" ? "All Shows" : st === "LIVE" ? "Live Now" : st === "ENDED" ? "Replays" : st}
              </button>
            ))}
          </div>

          <div className="lsp-search-box">
            <FaSearch style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Search live shows, performers..."
              className="lsp-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="lsp-category-scroll">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`lsp-cat-pill ${categoryFilter === cat ? "active" : ""}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === "ALL" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Live Shows Cards Grid */}
        {shows.length === 0 ? (
          <div className="lsp-empty">
            <MdLiveTv size={48} style={{ color: "#64748b", margin: "0 auto 1rem auto" }} />
            <h3 style={{ fontSize: "1.2rem", color: "#ffffff", margin: "0 0 0.5rem 0" }}>No Live Shows Found</h3>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
              There are currently no broadcasts matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="lsp-grid">
            {shows.map((show) => {
              const isPlaying = activeShow?._id === show._id;
              const isLive = show.status === "LIVE";
              const isUpcoming = show.status === "UPCOMING";
              const thumb =
                show.thumbnail ||
                show.banner ||
                (show.youtubeVideoId
                  ? `https://img.youtube.com/vi/${show.youtubeVideoId}/hqdefault.jpg`
                  : "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=60");

              return (
                <div
                  key={show._id}
                  className={`lsp-card ${isPlaying ? "is-active-playing" : ""}`}
                  onClick={() => handleSelectShow(show)}
                >
                  <div className="lsp-card-thumb">
                    <img src={thumb} alt={show.title} className="lsp-card-img" />

                    {isLive && (
                      <div className="lsp-badge-live">
                        <span className="lsp-live-pulse" /> LIVE
                      </div>
                    )}
                    {isUpcoming && <div className="lsp-badge-upcoming">UPCOMING</div>}
                    {show.status === "ENDED" && <div className="lsp-badge-ended">ENDED</div>}

                    <div className="lsp-card-viewers">
                      <FaEye /> {show.viewersCount || 0}
                    </div>
                  </div>

                  <div className="lsp-card-body">
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span className="lsp-tag-category">{show.category || "Live Show"}</span>
                    </div>

                    <h3 className="lsp-card-title">{show.title}</h3>
                    {show.description && <p className="lsp-card-desc">{show.description}</p>}

                    <div className="lsp-card-footer">
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        {show.scheduledStartTime
                          ? new Date(show.scheduledStartTime).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : "Broadcasting"}
                      </span>
                      <span className="lsp-watch-btn">
                        <FaPlay size={10} /> {isPlaying ? "Now Playing" : "Watch Live"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
