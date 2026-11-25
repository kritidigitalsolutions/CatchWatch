import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Hls from "hls.js";
import {
  FaPlay,
  FaPause,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaRedo,
  FaMapMarkerAlt,
  FaEye,
  FaTv,
  FaBolt,
  FaListOl,
  FaCommentDots,
  FaUsers,
  FaInfoCircle,
} from "react-icons/fa";
import { MdRefresh, MdSportsCricket } from "react-icons/md";
import {
  getActiveMatches,
  getMatchDetails,
  getMatchLiveActivity,
  getMatchScorecard,
  getMatchCommentary,
  getMatchSquads,
  pingViewer,
} from "../api/liveMatchApi";
import "./LiveMatchesPage.css";

const STATUS_FILTERS = ["ALL", "LIVE", "UPCOMING", "COMPLETED"];
const FORMAT_FILTERS = ["ALL", "T20", "ODI", "TEST", "LEAGUE"];

const FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop";

const getCricketBannerUrl = (url) => {
  if (!url || typeof url !== "string" || !url.trim()) return FALLBACK_BANNER;
  const cleanUrl = url.trim();
  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:")
  ) {
    return cleanUrl;
  }
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const baseUrl = apiBase.replace(/\/api\/?$/, "");
  return `${baseUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
};

const getCricketLogoUrl = (url) => {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  const cleanUrl = url.trim();
  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:")
  ) {
    return cleanUrl;
  }
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const baseUrl = apiBase.replace(/\/api\/?$/, "");
  return `${baseUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
};

export default function LiveMatchesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formatFilter, setFormatFilter] = useState("ALL");

  // Player state
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useBackupStream, setUseBackupStream] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Cricket Match Center Tabs
  const [activeTab, setActiveTab] = useState("SCORECARD"); // "SCORECARD" | "COMMENTARY" | "SQUADS" | "INFO"
  const [selectedInning, setSelectedInning] = useState(1); // 1 or 2

  // Fetch initial full details and tabs for a target match
  const fetchSingleMatchDetails = useCallback(async (matchId) => {
    if (!matchId) return;
    try {
      const [detailsRes, activityRes, scorecardRes, commsRes, squadsRes] = await Promise.allSettled([
        getMatchDetails(matchId),
        getMatchLiveActivity(matchId),
        getMatchScorecard(matchId),
        getMatchCommentary(matchId, 50),
        getMatchSquads(matchId),
      ]);

      const baseMatch =
        detailsRes.status === "fulfilled" && detailsRes.value?.success ? detailsRes.value.match : null;
      if (!baseMatch) return;

      const activity =
        activityRes.status === "fulfilled" && activityRes.value?.success ? activityRes.value : {};
      const scorecard =
        scorecardRes.status === "fulfilled" && scorecardRes.value?.success ? scorecardRes.value : {};
      const comms =
        commsRes.status === "fulfilled" && commsRes.value?.success ? commsRes.value : {};
      const squads =
        squadsRes.status === "fulfilled" && squadsRes.value?.success ? squadsRes.value : {};

      setActiveMatch((prev) => ({
        ...(prev && prev._id === matchId ? prev : {}),
        ...baseMatch,
        crr: activity.crr || activity.CRR || baseMatch.crr || "0.00",
        rrr: activity.rrr || activity.RRR || baseMatch.rrr || "0.00",
        target: activity.target ?? baseMatch.target ?? 0,
        striker: activity.striker || baseMatch.striker || null,
        nonStriker: activity.nonStriker || baseMatch.nonStriker || null,
        currentBowler: activity.bowler || activity.currentBowler || baseMatch.currentBowler || null,
        recentBalls: activity.recentBalls || baseMatch.recentBalls || [],
        currentOverBalls: activity.currentOverBalls || [],
        currentStatusText:
          activity.overStatusText || activity.currentStatusText || baseMatch.currentStatusText || "",
        innings1: scorecard.innings1 || baseMatch.innings1 || null,
        innings2: scorecard.innings2 || baseMatch.innings2 || null,
        commentary: comms.commentary || baseMatch.commentary || [],
        team1: {
          ...(baseMatch.team1 || {}),
          score: activity.scores?.team1 || activity.scores?.teamA?.score || baseMatch.team1?.score || "",
          players: squads.teamA?.players || squads.team1?.players || baseMatch.team1?.players || [],
        },
        team2: {
          ...(baseMatch.team2 || {}),
          score: activity.scores?.team2 || activity.scores?.teamB?.score || baseMatch.team2?.score || "",
          players: squads.teamB?.players || squads.team2?.players || baseMatch.team2?.players || [],
        },
      }));
    } catch (err) {
      console.warn("Could not fetch full match details:", err);
    }
  }, []);

  // Fetch all matches
  const fetchMatchesList = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const params = {};
        if (statusFilter !== "ALL") params.status = statusFilter;
        if (formatFilter !== "ALL") params.format = formatFilter;

        const res = await getActiveMatches(params);
        if (res?.success) {
          const list = res.matches || [];
          setMatches(list);

          // Determine target match
          let targetId = id;
          if (!targetId && list.length > 0) {
            const firstLive = list.find((m) => m.status === "LIVE");
            targetId = firstLive ? firstLive._id : list[0]._id;
          }

          if (targetId) {
            // Fetch the rich details (crease, commentary, squads, scorecard)
            await fetchSingleMatchDetails(targetId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live matches:", err);
        if (isInitial) setError("Failed to load cricket matches. Please try again.");
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [id, statusFilter, formatFilter, fetchSingleMatchDetails]
  );

  // Initial fetch
  useEffect(() => {
    fetchMatchesList(true);
  }, [fetchMatchesList]);

  // Ensure active match is always visible in fixtures list if list is empty
  useEffect(() => {
    if (activeMatch?._id && matches.length === 0) {
      setMatches([activeMatch]);
    }
  }, [activeMatch, matches.length]);

  // Real-time polling: poll live-activity every 3 seconds for lightweight crease & score update
  useEffect(() => {
    if (!activeMatch?._id) return;
    const matchId = activeMatch._id;

    const interval = setInterval(async () => {
      try {
        const activityRes = await getMatchLiveActivity(matchId);
        if (activityRes?.success) {
          setActiveMatch((prev) => {
            if (!prev || prev._id !== matchId) return prev;
            return {
              ...prev,
              status: activityRes.status || prev.status,
              isLive: activityRes.isLive !== undefined ? activityRes.isLive : prev.isLive,
              crr: activityRes.crr || activityRes.CRR || prev.crr,
              rrr: activityRes.rrr || activityRes.RRR || prev.rrr,
              target: activityRes.target ?? prev.target,
              striker: activityRes.striker || prev.striker,
              nonStriker: activityRes.nonStriker || prev.nonStriker,
              currentBowler: activityRes.bowler || activityRes.currentBowler || prev.currentBowler,
              recentBalls: activityRes.recentBalls || prev.recentBalls,
              currentOverBalls: activityRes.currentOverBalls || prev.currentOverBalls,
              currentStatusText:
                activityRes.overStatusText || activityRes.currentStatusText || prev.currentStatusText,
              team1: {
                ...(prev.team1 || {}),
                score:
                  activityRes.scores?.team1 ||
                  activityRes.scores?.teamA?.score ||
                  prev.team1?.score,
              },
              team2: {
                ...(prev.team2 || {}),
                score:
                  activityRes.scores?.team2 ||
                  activityRes.scores?.teamB?.score ||
                  prev.team2?.score,
              },
            };
          });
        }

        // If on Commentary tab, refresh commentary
        if (activeTab === "COMMENTARY") {
          const commsRes = await getMatchCommentary(matchId, 30);
          if (commsRes?.success && commsRes.commentary) {
            setActiveMatch((prev) => (prev ? { ...prev, commentary: commsRes.commentary } : prev));
          }
        }

        // If on Scorecard tab, refresh scorecard
        if (activeTab === "SCORECARD") {
          const scRes = await getMatchScorecard(matchId);
          if (scRes?.success) {
            setActiveMatch((prev) =>
              prev
                ? {
                    ...prev,
                    innings1: scRes.innings1 || prev.innings1,
                    innings2: scRes.innings2 || prev.innings2,
                  }
                : prev
            );
          }
        }
      } catch (e) {
        // quiet error on polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeMatch?._id, activeTab]);

  // Periodic fixtures list refresh (every 15s)
  useEffect(() => {
    const listInterval = setInterval(() => {
      fetchMatchesList(false);
    }, 15000);
    return () => clearInterval(listInterval);
  }, [fetchMatchesList]);

  // Ping viewer count once when active match changes
  useEffect(() => {
    if (activeMatch?._id) {
      pingViewer(activeMatch._id).catch(() => {});
      setUseBackupStream(false);
      setStreamError(false);
      if (activeMatch.currentInnings) {
        setSelectedInning(activeMatch.currentInnings);
      }
    }
  }, [activeMatch?._id, activeMatch?.currentInnings]);

  // Get current active stream URL
  const currentStreamUrl =
    useBackupStream && activeMatch?.backupStreamUrl
      ? activeMatch.backupStreamUrl
      : activeMatch?.streamUrl;

  // Determine stream type
  const isYouTube =
    currentStreamUrl &&
    (currentStreamUrl.includes("youtube.com") || currentStreamUrl.includes("youtu.be"));

  const isEmbed =
    activeMatch?.streamType === "embed" ||
    (currentStreamUrl &&
      (currentStreamUrl.includes("/embed/") || currentStreamUrl.includes("player.")));

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("embed/")) return url;
    if (url.includes("watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      const vid = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${vid}`;
    }
    return url;
  };

  // Video playback & Hls.js initialization
  useEffect(() => {
    if (!currentStreamUrl || isYouTube || isEmbed) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setStreamError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls =
      activeMatch?.streamType === "hls" ||
      currentStreamUrl.toLowerCase().includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(currentStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch((e) => {
            console.warn("Autoplay was prevented by browser:", e);
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data.type);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setStreamError(true);
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentStreamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    } else {
      video.src = currentStreamUrl;
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentStreamUrl, activeMatch?.streamType, isYouTube, isEmbed]);

  // Video Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.log(err));
      setIsFullscreen(false);
    }
  };

  const handleSelectMatch = (match) => {
    setActiveMatch(match);
    navigate(`/live-cricket/${match._id}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Determine active scorecard innings
  const inningsData =
    selectedInning === 2 ? activeMatch?.innings2 : activeMatch?.innings1;

  return (
    <div className="live-cricket-page">
      {/* ── TOP HEADER ── */}
      {/* <div className="lcp-top-bar">
        <div className="lcp-container">
          <div className="lcp-header-content">
            
            <h1 className="lcp-main-heading">Live Cricket Matches & Scores</h1>
            <p className="lcp-main-subheading">
              Watch non-stop live cricket streams, ball-by-ball score updates, full scorecards, and playing XI squads.
            </p>
          </div>
        </div>
      </div> */}

      <div className="lcp-container">
        {/* ── MAIN HERO SECTION: VIDEO PLAYER + LIVE SCOREBOARD ── */}
        {activeMatch ? (
          <div className="lcp-hero-card">
            {/* ── VIDEO PLAYER WRAPPER ── */}
            <div className="lcp-player-wrapper" ref={playerContainerRef}>
              {isYouTube ? (
                <iframe
                  src={getYouTubeEmbedUrl(currentStreamUrl)}
                  title={activeMatch.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="lcp-video-frame"
                />
              ) : isEmbed ? (
                <iframe
                  src={currentStreamUrl}
                  title={activeMatch.title}
                  allowFullScreen
                  className="lcp-video-frame"
                />
              ) : (
                <div className="lcp-html5-player">
                  <video
                    ref={videoRef}
                    playsInline
                    className="lcp-video-element"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setStreamError(true)}
                  />

                  {/* Overlaid Player Controls for HTML5 Video */}
                  <div className="lcp-player-controls">
                    <button className="lcp-ctrl-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <button className="lcp-ctrl-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                      {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>

                    <div className="lcp-ctrl-spacer" />

                    {activeMatch.status === "LIVE" && (
                      <div className="lcp-ctrl-live-tag">
                        <span className="ctrl-dot" /> LIVE
                      </div>
                    )}

                    <button className="lcp-ctrl-btn" onClick={toggleFullscreen} title="Fullscreen">
                      {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </button>
                  </div>
                </div>
              )}

              {/* Stream Error Overlay */}
              {streamError && (
                <div className="lcp-stream-error-overlay">
                  <FaTv className="error-tv-icon" />
                  <h4>Stream Signal Interrupted</h4>
                  <p>The primary broadcast stream is currently reconnecting or buffering.</p>
                  {activeMatch.backupStreamUrl && !useBackupStream && (
                    <button
                      className="lcp-switch-backup-btn"
                      onClick={() => {
                        setUseBackupStream(true);
                        setStreamError(false);
                      }}
                    >
                      <FaRedo /> Switch to Backup Stream
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── LIVE SCOREBOARD STRIP BELOW PLAYER ── */}
            <div className="lcp-scoreboard-strip">
              <div className="lcp-score-header">
                <div className="lcp-tournament-badge">
                  <span className="format-tag">{activeMatch.matchFormat}</span>
                  <span className="tour-title">{activeMatch.tournament}</span>
                </div>

                <div className="lcp-score-actions">
                  {activeMatch.status === "LIVE" ? (
                    <span className="badge-live-now">
                      <span className="dot-blink" /> LIVE NOW
                    </span>
                  ) : activeMatch.status === "UPCOMING" ? (
                    <span className="badge-upcoming">UPCOMING</span>
                  ) : (
                    <span className="badge-completed">COMPLETED</span>
                  )}

                  <span className="badge-viewers">
                    <FaEye /> {activeMatch.viewersCount || 1} watching
                  </span>

                  <button
                    className="lcp-refresh-btn"
                    onClick={() => fetchSingleMatchDetails(activeMatch._id)}
                    title="Refresh score"
                  >
                    <MdRefresh />
                  </button>
                </div>
              </div>

              {/* Title & Venue */}
              <div className="lcp-match-title-row">
                <h2 className="lcp-match-title">{activeMatch.title}</h2>
                {activeMatch.venue && (
                  <div className="lcp-match-venue">
                    <FaMapMarkerAlt />
                    <span>{activeMatch.venue}</span>
                  </div>
                )}
              </div>

              {/* Teams & Scores Comparison */}
              <div className="lcp-teams-score-board">
                {/* Team 1 */}
                <div className="lcp-team-block">
                  <div className="lcp-team-identity">
                    {activeMatch.team1?.logo ? (
                      <img
                        src={activeMatch.team1.logo}
                        alt={activeMatch.team1.name}
                        className="lcp-team-flag"
                      />
                    ) : (
                      <div className="lcp-flag-placeholder">
                        {activeMatch.team1?.shortName || activeMatch.team1?.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="lcp-team-name-lg">
                        {activeMatch.team1?.name}
                        {activeMatch.battingTeam === "team1" && (
                          <span className="lcp-batting-tag">🏏 Batting</span>
                        )}
                      </h3>
                      <span className="lcp-team-code">{activeMatch.team1?.shortName}</span>
                    </div>
                  </div>
                  <div className="lcp-score-display">{activeMatch.team1?.score || "—"}</div>
                </div>

                <div className="lcp-vs-separator">
                  <span>VS</span>
                </div>

                {/* Team 2 */}
                <div className="lcp-team-block">
                  <div className="lcp-team-identity">
                    {activeMatch.team2?.logo ? (
                      <img
                        src={activeMatch.team2.logo}
                        alt={activeMatch.team2.name}
                        className="lcp-team-flag"
                      />
                    ) : (
                      <div className="lcp-flag-placeholder">
                        {activeMatch.team2?.shortName || activeMatch.team2?.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="lcp-team-name-lg">
                        {activeMatch.team2?.name}
                        {activeMatch.battingTeam === "team2" && (
                          <span className="lcp-batting-tag">🏏 Batting</span>
                        )}
                      </h3>
                      <span className="lcp-team-code">{activeMatch.team2?.shortName}</span>
                    </div>
                  </div>
                  <div className="lcp-score-display">{activeMatch.team2?.score || "—"}</div>
                </div>
              </div>

              {/* Live Status Text / Commentary Banner */}
              {activeMatch.currentStatusText && (
                <div className="lcp-commentary-banner">
                  <FaBolt className="bolt-icon" />
                  <span>{activeMatch.currentStatusText}</span>
                </div>
              )}

              {/* ── LIVE CREASE ACTIVITY BOX (ACTIVE BATSMEN & BOWLER) ── */}
              {(activeMatch.striker?.name ||
                activeMatch.currentBowler?.name ||
                (activeMatch.recentBalls && activeMatch.recentBalls.length > 0)) && (
                <div className="lcp-crease-box">
                  <div className="lcp-crease-header">
                    <span className="crease-title">
                      <MdSportsCricket className="inline mr-1" /> ON CREASE & LIVE ACTIVITY
                    </span>
                    <div className="lcp-rates-strip">
                      {activeMatch.crr && (
                        <span className="rate-chip">
                          CRR: <strong>{activeMatch.crr}</strong>
                        </span>
                      )}
                      {activeMatch.currentInnings === 2 && activeMatch.rrr && (
                        <span className="rate-chip rrr">
                          RRR: <strong>{activeMatch.rrr}</strong> (Target: {activeMatch.target})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="lcp-crease-grid">
                    {/* Striker */}
                    <div className="lcp-crease-player-card striker">
                      <div className="player-meta">
                        <span className="role-tag striker-badge">
                          <span className="striker-dot" /> 🏏 STRIKER (ON STRIKE)
                        </span>
                        <span className="player-name">{activeMatch.striker?.name || "Striker"}</span>
                      </div>
                      <div className="player-stats">
                        <span className="primary-stat">
                          {activeMatch.striker?.runs || 0}{" "}
                          <small>({activeMatch.striker?.balls || 0}b)</small>
                        </span>
                        <span className="secondary-stats">
                          4s: {activeMatch.striker?.fours || 0} | 6s: {activeMatch.striker?.sixes || 0} | SR:{" "}
                          {activeMatch.striker?.strikeRate || 0}
                        </span>
                      </div>
                    </div>

                    {/* Non-Striker */}
                    <div className="lcp-crease-player-card non-striker">
                      <div className="player-meta">
                        <span className="role-tag non-striker-badge">🏃 NON-STRIKER</span>
                        <span className="player-name">{activeMatch.nonStriker?.name || "Non-Striker"}</span>
                      </div>
                      <div className="player-stats">
                        <span className="primary-stat">
                          {activeMatch.nonStriker?.runs || 0}{" "}
                          <small>({activeMatch.nonStriker?.balls || 0}b)</small>
                        </span>
                        <span className="secondary-stats">
                          4s: {activeMatch.nonStriker?.fours || 0} | 6s: {activeMatch.nonStriker?.sixes || 0} | SR:{" "}
                          {activeMatch.nonStriker?.strikeRate || 0}
                        </span>
                      </div>
                    </div>

                    {/* Bowler */}
                    <div className="lcp-crease-player-card bowler">
                      <div className="player-meta">
                        <span className="role-tag">🎯 Current Bowler</span>
                        <span className="player-name">{activeMatch.currentBowler?.name || "Bowler"}</span>
                      </div>
                      <div className="player-stats">
                        <span className="primary-stat">
                          {activeMatch.currentBowler?.wickets || 0}/{activeMatch.currentBowler?.runsConceded || 0}{" "}
                          <small>({activeMatch.currentBowler?.overs || 0} ov)</small>
                        </span>
                        <span className="secondary-stats">
                          M: {activeMatch.currentBowler?.maidens || 0} | Econ:{" "}
                          {activeMatch.currentBowler?.economy || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ball by Ball Over Ticker */}
                  {activeMatch.recentBalls && activeMatch.recentBalls.length > 0 && (
                    <div className="lcp-ball-ticker-row">
                      <span className="ticker-label">Recent Balls:</span>
                      <div className="ticker-balls-list">
                        {activeMatch.recentBalls.slice(-14).map((ball, i) => (
                          <span
                            key={i}
                            className={`lcp-ball-chip ${
                              ball === "4"
                                ? "four"
                                : ball === "6"
                                ? "six"
                                : ball === "W"
                                ? "wicket"
                                : ball.toLowerCase().includes("wd") || ball.toLowerCase().includes("nb")
                                ? "extra"
                                : "dot"
                            }`}
                          >
                            {ball}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stream Switcher if backup URL exists */}
              {activeMatch.backupStreamUrl && (
                <div className="lcp-stream-switcher">
                  <span className="server-label">Stream Server:</span>
                  <button
                    className={`server-btn ${!useBackupStream ? "active" : ""}`}
                    onClick={() => {
                      setUseBackupStream(false);
                      setStreamError(false);
                    }}
                  >
                    Server 1 (Primary)
                  </button>
                  <button
                    className={`server-btn ${useBackupStream ? "active" : ""}`}
                    onClick={() => {
                      setUseBackupStream(true);
                      setStreamError(false);
                    }}
                  >
                    Server 2 (Backup)
                  </button>
                </div>
              )}

              {/* ── INTERACTIVE CRICKET MATCH CENTER TABS ── */}
              <div className="lcp-match-center">
                <div className="lcp-match-tabs">
                  <button
                    className={`lcp-match-tab-btn ${activeTab === "SCORECARD" ? "active" : ""}`}
                    onClick={() => setActiveTab("SCORECARD")}
                  >
                    <FaListOl /> Scorecard
                  </button>
                  <button
                    className={`lcp-match-tab-btn ${activeTab === "COMMENTARY" ? "active" : ""}`}
                    onClick={() => setActiveTab("COMMENTARY")}
                  >
                    <FaCommentDots /> Commentary ({activeMatch.commentary?.length || 0})
                  </button>
                  <button
                    className={`lcp-match-tab-btn ${activeTab === "SQUADS" ? "active" : ""}`}
                    onClick={() => setActiveTab("SQUADS")}
                  >
                    <FaUsers /> Playing XI </button>
                  <button
                    className={`lcp-match-tab-btn ${activeTab === "INFO" ? "active" : ""}`}
                    onClick={() => setActiveTab("INFO")}
                  >
                    <FaInfoCircle /> Match Info
                  </button>
                </div>

                {/* ── TAB 1: SCORECARD ── */}
                {activeTab === "SCORECARD" && (
                  <div className="lcp-tab-pane">
                    {/* Innings Selector */}
                    <div className="lcp-innings-selector">
                      <button
                        className={`inning-btn ${selectedInning === 1 ? "active" : ""}`}
                        onClick={() => setSelectedInning(1)}
                      >
                        1st Innings: {activeMatch.innings1?.teamName || activeMatch.team1?.name} (
                        {activeMatch.innings1?.score || activeMatch.team1?.score || "—"})
                      </button>
                      <button
                        className={`inning-btn ${selectedInning === 2 ? "active" : ""}`}
                        onClick={() => setSelectedInning(2)}
                      >
                        2nd Innings: {activeMatch.innings2?.teamName || activeMatch.team2?.name} (
                        {activeMatch.innings2?.score || activeMatch.team2?.score || "Yet to bat"})
                      </button>
                    </div>

                    {/* Batting Scorecard Table */}
                    <div className="lcp-table-scroll-hint">
                      <span>⇄ Scroll table horizontally for all stats (R, B, 4s, 6s, SR)</span>
                    </div>
                    <div className="lcp-table-responsive">
                      <table className="lcp-scorecard-table">
                        <thead>
                          <tr>
                            <th className="text-left">Batter</th>
                            <th className="text-left">Dismissal</th>
                            <th className="text-center">R</th>
                            <th className="text-center">B</th>
                            <th className="text-center">4s</th>
                            <th className="text-center">6s</th>
                            <th className="text-center">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inningsData?.batsmen && inningsData.batsmen.length > 0 ? (
                            inningsData.batsmen.map((b, idx) => {
                              const norm = (str) =>
                                (str || "").replace(/\s*\(c\)/i, "").replace(/\s*\(wk\)/i, "").trim().toLowerCase();
                              const isStriker =
                                !b.isOut &&
                                activeMatch?.striker?.name &&
                                norm(b.playerName) &&
                                norm(activeMatch.striker.name) &&
                                (norm(b.playerName) === norm(activeMatch.striker.name) ||
                                  norm(b.playerName).includes(norm(activeMatch.striker.name)) ||
                                  norm(activeMatch.striker.name).includes(norm(b.playerName)));

                              const isNonStriker =
                                !b.isOut &&
                                !isStriker &&
                                activeMatch?.nonStriker?.name &&
                                norm(b.playerName) &&
                                norm(activeMatch.nonStriker.name) &&
                                (norm(b.playerName) === norm(activeMatch.nonStriker.name) ||
                                  norm(b.playerName).includes(norm(activeMatch.nonStriker.name)) ||
                                  norm(activeMatch.nonStriker.name).includes(norm(b.playerName)));

                              return (
                                <tr
                                  key={idx}
                                  className={`${isStriker ? "on-strike-row" : ""} ${
                                    !b.isOut ? "not-out-row" : ""
                                  }`}
                                >
                                  <td className="batter-name font-bold">
                                    <span className="batter-name-text">{b.playerName}</span>
                                    {isStriker ? (
                                      <span className="on-strike-badge" title="Currently on strike">
                                        🏏* <span className="on-strike-text">ON STRIKE</span>
                                      </span>
                                    ) : isNonStriker ? (
                                      <span className="not-out-star" title="Non-striker (not out)">
                                        *
                                      </span>
                                    ) : !b.isOut ? (
                                      <span className="not-out-star" title="Not out">
                                        *
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="dismissal-text">{b.dismissalText || "not out"}</td>
                                  <td className="text-center runs-cell font-black text-base">{b.runs}</td>
                                  <td className="text-center stat-cell font-semibold">{b.balls}</td>
                                  <td className="text-center stat-cell font-semibold">{b.fours}</td>
                                  <td className="text-center stat-cell font-semibold">{b.sixes}</td>
                                  <td className="text-center sr-cell font-bold">{b.strikeRate}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center py-4 empty-note">
                                Batting data will appear as the innings progresses.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Extras & Total Row */}
                    <div className="lcp-scorecard-summary-row">
                      <div className="summary-col">
                        <span className="summary-label">Extras:</span>
                        <span className="summary-val">
                          {inningsData?.extras?.total || 0} (b {inningsData?.extras?.byes || 0}, lb{" "}
                          {inningsData?.extras?.legByes || 0}, w {inningsData?.extras?.wides || 0}, nb{" "}
                          {inningsData?.extras?.noBalls || 0})
                        </span>
                      </div>
                      <div className="summary-col right">
                        <span className="summary-label">Total:</span>
                        <span className="summary-total-val">
                          {inningsData?.totalRuns || 0}/{inningsData?.wickets || 0} ({inningsData?.overs || 0} Ov)
                        </span>
                      </div>
                    </div>

                    {/* Fall of Wickets */}
                    {inningsData?.fow && inningsData.fow.length > 0 && (
                      <div className="lcp-fow-section">
                        <span className="fow-title">Fall of Wickets:</span>
                        <div className="fow-items">
                          {inningsData.fow.map((f, i) => (
                            <span key={i} className="fow-chip">
                              <strong>{f.score}</strong> ({f.playerName}, {f.over} ov)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bowling Scorecard Table */}
                    <div className="lcp-table-scroll-hint mt-4">
                      <span>⇄ Scroll table horizontally for bowling figures (O, M, R, W, ECON)</span>
                    </div>
                    <div className="lcp-table-responsive mt-1">
                      <table className="lcp-scorecard-table bowling">
                        <thead>
                          <tr>
                            <th className="text-left">Bowler</th>
                            <th className="text-center">O</th>
                            <th className="text-center">M</th>
                            <th className="text-center">R</th>
                            <th className="text-center">W</th>
                            <th className="text-center">ECON</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inningsData?.bowlers && inningsData.bowlers.length > 0 ? (
                            inningsData.bowlers.map((bw, idx) => (
                              <tr key={idx}>
                                <td className="bowler-name font-bold">{bw.bowlerName}</td>
                                <td className="text-center stat-cell font-semibold">{bw.overs}</td>
                                <td className="text-center stat-cell font-semibold">{bw.maidens}</td>
                                <td className="text-center stat-cell font-semibold">{bw.runsConceded}</td>
                                <td className="text-center wickets-cell font-black text-base">{bw.wickets}</td>
                                <td className="text-center econ-cell font-bold">{bw.economy}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center py-4 empty-note">
                                Bowling figures will appear as overs are bowled.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: COMMENTARY ── */}
                {activeTab === "COMMENTARY" && (
                  <div className="lcp-tab-pane">
                    <div className="lcp-commentary-feed">
                      {activeMatch.commentary && activeMatch.commentary.length > 0 ? (
                        activeMatch.commentary.map((c, idx) => (
                          <div key={idx} className="lcp-commentary-item">
                            <div className="commentary-left">
                              <span className="commentary-over">{c.over ? `Ov ${c.over}` : "Live"}</span>
                              {c.isBoundary && (
                                <span className={`comm-badge ${c.boundaryType === "6" ? "six" : "four"}`}>
                                  {c.boundaryType === "6" ? "SIX 💥" : "FOUR 🔥"}
                                </span>
                              )}
                              {c.isWicket && <span className="comm-badge wicket">WICKET 🔴</span>}
                            </div>
                            <div className="commentary-right">
                              <p className="commentary-text">{c.text}</p>
                              {c.timestamp && (
                                <span className="commentary-time">
                                  {new Date(c.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="lcp-empty-tab-note">
                          Ball-by-ball commentary and milestone alerts will stream here as the match progresses.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: PLAYING XI & SQUADS ── */}
                {activeTab === "SQUADS" && (
                  <div className="lcp-tab-pane">
                    <div className="lcp-squads-grid">
                      {/* Team 1 Squad */}
                      <div className="lcp-team-squad-column">
                        <div className="squad-header">
                          {activeMatch.team1?.logo && (
                            <img src={activeMatch.team1.logo} alt="" className="squad-team-flag" />
                          )}
                          <h4>{activeMatch.team1?.name} Playing XI</h4>
                        </div>
                        <div className="squad-players-list">
                          {activeMatch.team1?.players && activeMatch.team1.players.length > 0 ? (
                            activeMatch.team1.players.map((p, idx) => (
                              <div key={idx} className="squad-player-item">
                                <span className="player-order">#{idx + 1}</span>
                                <div className="player-info">
                                  <span className="player-fullname">{p.name}</span>
                                  <span className="player-meta-badges">
                                    {p.isCaptain && <span className="badge-cap">Captain</span>}
                                    {p.isWicketKeeper && <span className="badge-wk">WK</span>}
                                    <span className="badge-role">{p.role}</span>
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="no-squad-msg">Playing XI will be announced at toss time.</div>
                          )}
                        </div>
                      </div>

                      {/* Team 2 Squad */}
                      <div className="lcp-team-squad-column">
                        <div className="squad-header">
                          {activeMatch.team2?.logo && (
                            <img src={activeMatch.team2.logo} alt="" className="squad-team-flag" />
                          )}
                          <h4>{activeMatch.team2?.name} Playing XI</h4>
                        </div>
                        <div className="squad-players-list">
                          {activeMatch.team2?.players && activeMatch.team2.players.length > 0 ? (
                            activeMatch.team2.players.map((p, idx) => (
                              <div key={idx} className="squad-player-item">
                                <span className="player-order">#{idx + 1}</span>
                                <div className="player-info">
                                  <span className="player-fullname">{p.name}</span>
                                  <span className="player-meta-badges">
                                    {p.isCaptain && <span className="badge-cap">Captain</span>}
                                    {p.isWicketKeeper && <span className="badge-wk">WK</span>}
                                    <span className="badge-role">{p.role}</span>
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="no-squad-msg">Playing XI will be announced at toss time.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 4: MATCH INFO ── */}
                {activeTab === "INFO" && (
                  <div className="lcp-tab-pane">
                    <div className="lcp-info-grid">
                      <div className="lcp-info-item">
                        <span className="info-lbl">Series / Tournament:</span>
                        <span className="info-val">{activeMatch.tournament}</span>
                      </div>

                      <div className="lcp-info-item">
                        <span className="info-lbl">Match Type:</span>
                        <span className="info-val">{activeMatch.matchFormat} Cricket</span>
                      </div>

                      <div className="lcp-info-item">
                        <span className="info-lbl">Venue & Stadium:</span>
                        <span className="info-val">{activeMatch.venue || "International Stadium"}</span>
                      </div>

                      <div className="lcp-info-item">
                        <span className="info-lbl">Date & Time:</span>
                        <span className="info-val">
                          {new Date(activeMatch.startTime).toLocaleString([], {
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <div className="lcp-info-item">
                        <span className="info-lbl">Toss:</span>
                        <span className="info-val">{activeMatch.toss || "Toss yet to happen"}</span>
                      </div>

                      <div className="lcp-info-item">
                        <span className="info-lbl">Broadcast Format:</span>
                        <span className="info-val">{activeMatch.streamType?.toUpperCase()} HD Stream</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="lcp-loading-box">
            <div className="lcp-spinner" />
            <p>Loading live match stream...</p>
          </div>
        ) : (
          <div className="lcp-no-active-box">
            <FaTv className="no-match-icon" />
            <h3>{error ? "Failed to Load Matches" : "No Live Matches Scheduled At This Moment"}</h3>
            <p>{error || "Check back shortly or explore the upcoming fixtures below."}</p>
            {error && (
              <button className="lcp-switch-backup-btn mt-3" onClick={() => fetchMatchesList(true)}>
                <MdRefresh /> Try Again
              </button>
            )}
          </div>
        )}

        {/* ── ALL FIXTURES & OTHER MATCHES SECTION ── */}
        <div className="lcp-fixtures-section">
          <div className="lcp-fixtures-header">
            <div>
              <h3 className="lcp-section-title">All Cricket Matches & Fixtures</h3>
              <p className="lcp-section-desc">Select any match to switch the live stream player</p>
            </div>

            {/* Desktop Filter Tabs */}
            <div className="lcp-filter-tabs">
              {STATUS_FILTERS.map((st) => (
                <button
                  key={st}
                  className={`lcp-filter-btn ${statusFilter === st ? "active" : ""}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "LIVE" && <span className="tab-dot" />}
                  {st === "ALL"
                    ? "All Matches"
                    : st === "LIVE"
                    ? "Live Now"
                    : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}

              <div className="lcp-divider-inline" />

              {FORMAT_FILTERS.map((fmt) => (
                <button
                  key={fmt}
                  className={`lcp-filter-btn format-btn ${formatFilter === fmt ? "active" : ""}`}
                  onClick={() => setFormatFilter(fmt)}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Mobile Filter Dropdowns */}
            <div className="lcp-mobile-filters">
              <div className="lcp-mobile-select-group">
                <label htmlFor="lcp-status-filter" className="lcp-select-label">Status</label>
                <div className="lcp-select-wrapper">
                  <select
                    id="lcp-status-filter"
                    className="lcp-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">🏏 All Matches</option>
                    <option value="LIVE">🔴 Live Now</option>
                    <option value="UPCOMING">⏳ Upcoming</option>
                    <option value="COMPLETED">✅ Completed</option>
                  </select>
                  <span className="lcp-select-arrow">▼</span>
                </div>
              </div>

              <div className="lcp-mobile-select-group">
                <label htmlFor="lcp-format-filter" className="lcp-select-label">Format</label>
                <div className="lcp-select-wrapper">
                  <select
                    id="lcp-format-filter"
                    className="lcp-filter-select"
                    value={formatFilter}
                    onChange={(e) => setFormatFilter(e.target.value)}
                  >
                    <option value="ALL">All Formats</option>
                    <option value="T20">T20</option>
                    <option value="ODI">ODI</option>
                    <option value="TEST">TEST</option>
                    <option value="LEAGUE">LEAGUE</option>
                  </select>
                  <span className="lcp-select-arrow">▼</span>
                </div>
              </div>
            </div>
          </div>

          {/* Matches Grid */}
          <div className="lcp-matches-grid">
            {matches && matches.length > 0 ? (
              matches.map((match) => {
                const isSelected = activeMatch?._id === match._id;
                const bannerSrc = getCricketBannerUrl(match.banner || match.streamThumbnailUrl);
                const team1Logo = getCricketLogoUrl(match.team1?.logo || match.team1?.flagUrl);
                const team2Logo = getCricketLogoUrl(match.team2?.logo || match.team2?.flagUrl);

                return (
                  <div
                    key={match._id}
                    className={`lcp-fixture-card ${isSelected ? "is-selected" : ""} ${
                      match.status === "LIVE" ? "card-live" : ""
                    }`}
                    onClick={() => handleSelectMatch(match)}
                  >
                    {/* Card Banner Media */}
                    <div className="lcp-fixture-banner">
                      <img
                        src={bannerSrc}
                        alt={match.title}
                        referrerPolicy="no-referrer"
                        className="lcp-fixture-banner-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_BANNER;
                        }}
                      />
                      <div className="lcp-banner-overlay-grad" />

                      <div className="lcp-banner-top-badges">
                        <span className="lcp-pill-fmt">{match.matchFormat}</span>
                        {match.status === "LIVE" ? (
                          <span className="lcp-pill-live">
                            <span className="dot" /> LIVE
                          </span>
                        ) : match.status === "UPCOMING" ? (
                          <span className="lcp-pill-upcoming">UPCOMING</span>
                        ) : (
                          <span className="lcp-pill-completed">COMPLETED</span>
                        )}
                      </div>

                      <div className="lcp-play-hover-btn">
                        <FaPlay />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="lcp-fixture-body">
                      <div className="lcp-tournament-label">{match.tournament}</div>
                      <h4 className="lcp-fixture-title" title={match.title}>
                        {match.title}
                      </h4>

                      {/* Compact Teams vs Strip */}
                      <div className="lcp-teams-compact-strip">
                        <div className="lcp-compact-team">
                          {team1Logo ? (
                            <img src={team1Logo} alt="" className="lcp-compact-logo" />
                          ) : (
                            <div className="lcp-compact-ph">
                              {match.team1?.shortName || match.team1?.name?.charAt(0)}
                            </div>
                          )}
                          <span className="lcp-compact-name">{match.team1?.name}</span>
                          <span className="lcp-compact-score">{match.team1?.score || "—"}</span>
                        </div>

                        <div className="lcp-compact-team">
                          {team2Logo ? (
                            <img src={team2Logo} alt="" className="lcp-compact-logo" />
                          ) : (
                            <div className="lcp-compact-ph">
                              {match.team2?.shortName || match.team2?.name?.charAt(0)}
                            </div>
                          )}
                          <span className="lcp-compact-name">{match.team2?.name}</span>
                          <span className="lcp-compact-score">{match.team2?.score || "—"}</span>
                        </div>
                      </div>

                      {/* Venue / Time Footer */}
                      <div className="lcp-fixture-footer">
                        {match.venue && (
                          <span className="lcp-foot-meta">
                            <FaMapMarkerAlt /> {match.venue}
                          </span>
                        )}
                        <span className="lcp-foot-cta">Watch Broadcast →</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="lcp-no-fixtures-box">
                <p>No matches found matching the selected filter.</p>
                <button
                  type="button"
                  className="lcp-reset-filters-btn"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setFormatFilter("ALL");
                  }}
                >
                  View All Matches
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
