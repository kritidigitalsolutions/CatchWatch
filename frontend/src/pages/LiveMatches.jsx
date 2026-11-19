import React, { useState, useEffect, useCallback, useRef } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import Pagination from "../components/Pagination";
import {
  Radio,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Play,
  Eye,
  Tv,
  Calendar,
  MapPin,
  ExternalLink,
  CheckCircle,
  Clock,
  X,
  Volume2,
  Copy,
  Check,
  Zap,
  Upload,
  Image,
  Activity,
  Users,
  ArrowRightLeft,
  Sliders,
  Shield,
  Award,
  RotateCcw,
  CornerUpLeft,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import "./LiveMatches.css";

const FORMAT_OPTIONS = ["T20", "ODI", "TEST", "LEAGUE", "OTHER"];
const STATUS_OPTIONS = ["ALL", "LIVE", "UPCOMING", "COMPLETED"];

export default function LiveMatches() {
  const { showToast } = useToast ? useToast() : { showToast: (msg) => alert(msg) };

  // Data states
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, live: 0, upcoming: 0, completed: 0 });

  // Filter & Pagination states
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const limit = 9;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [saving, setSaving] = useState(false);

  // Quick Score Modal
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ team1Score: "", team2Score: "", currentStatusText: "" });

  // Stream Preview Modal
  const [previewStream, setPreviewStream] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    title: "",
    tournament: "ICC / International Cricket",
    matchFormat: "T20",
    venue: "",
    startTime: new Date().toISOString().slice(0, 16),
    status: "LIVE",
    currentStatusText: "",
    streamUrl: "",
    backupStreamUrl: "",
    streamType: "auto",
    banner: "",
    isFeatured: true,
    isPremium: false,
    order: 0,
    isActive: true,
    team1Name: "India",
    team1ShortName: "IND",
    team1Logo: "",
    team1Score: "",
    team2Name: "Australia",
    team2ShortName: "AUS",
    team2Logo: "",
    team2Score: "",
    toss: "",
    target: 0,
  });

  const [files, setFiles] = useState({
    bannerFile: null,
    team1LogoFile: null,
    team2LogoFile: null,
  });

  const [previews, setPreviews] = useState({
    banner: null,
    team1Logo: null,
    team2Logo: null,
  });

  const bannerFileRef = useRef(null);
  const team1LogoFileRef = useRef(null);
  const team2LogoFileRef = useRef(null);

  // ── LIVE MATCH SCORER & ACTIVITY CONSOLE STATES ──
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [consoleMatch, setConsoleMatch] = useState(null);
  const [consoleTab, setConsoleTab] = useState("SCORER"); // "SCORER" | "SQUADS" | "SCORECARD"
  const [consoleLoading, setConsoleLoading] = useState(false);

  // Wicket Dialog in Scorer Console
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [wicketForm, setWicketForm] = useState({
    wicketType: "caught",
    dismissedPlayer: "",
    fielder: "",
    newPlayer: "",
  });
  const [customFielderName, setCustomFielderName] = useState("");
  const [customNewPlayerName, setCustomNewPlayerName] = useState("");
  const [nextBowlerSelection, setNextBowlerSelection] = useState("");

  // Next Over Dialog (Modal Popup - Replaces browser alert/prompt)
  const [showNextOverModal, setShowNextOverModal] = useState(false);
  const [nextOverBowler, setNextOverBowler] = useState("");
  const [customNextOverBowler, setCustomNextOverBowler] = useState("");
  const [rotateStrikeOnNewOver, setRotateStrikeOnNewOver] = useState(false);

  // Custom Crease Player Modal (Replaces browser prompt)
  const [showCustomCreaseModal, setShowCustomCreaseModal] = useState(false);
  const [customCreaseRole, setCustomCreaseRole] = useState("striker");
  const [customCreaseName, setCustomCreaseName] = useState("");

  // Quick Commentary Input in Scorer Console
  const [quickComment, setQuickComment] = useState("");

  // Squads State inside Console
  const [squadTeam, setSquadTeam] = useState("team1");
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    role: "BATSMAN",
    isCaptain: false,
    isWicketKeeper: false,
  });
  const [bulkSquadText, setBulkSquadText] = useState("");

  // Scorecard Editor State
  const [scorecardForm, setScorecardForm] = useState({
    currentInnings: 1,
    battingTeam: "team1",
    bowlingTeam: "team2",
    target: 0,
    crr: "0.00",
    rrr: "0.00",
    toss: "",
    team1Score: "",
    team2Score: "",
    currentStatusText: "",
  });

  // File selection handler
  const handleFileSelect = (field, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [`${field}File`]: file }));
      setPreviews((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  // Clear selected file or preview
  const handleClearFile = (field) => {
    setFiles((prev) => ({ ...prev, [`${field}File`]: null }));
    if (field === "banner" && bannerFileRef.current) bannerFileRef.current.value = "";
    if (field === "team1Logo" && team1LogoFileRef.current) team1LogoFileRef.current.value = "";
    if (field === "team2Logo" && team2LogoFileRef.current) team2LogoFileRef.current.value = "";

    setPreviews((prev) => ({
      ...prev,
      [field]: field === "banner" ? formData.banner || null : formData[field] || null,
    }));
  };

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (activeTab !== "ALL") params.status = activeTab;
      if (selectedFormat !== "ALL") params.format = selectedFormat;

      const res = await API.get("/admin/live-matches", { params });
      if (res.data?.success) {
        setMatches(res.data.matches || []);
        setTotalMatches(res.data.pagination?.total || 0);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      showToast(err.response?.data?.message || "Failed to load live matches", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, activeTab, selectedFormat]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingMatch(null);
    setFiles({ bannerFile: null, team1LogoFile: null, team2LogoFile: null });
    setPreviews({ banner: null, team1Logo: null, team2Logo: null });
    if (bannerFileRef.current) bannerFileRef.current.value = "";
    if (team1LogoFileRef.current) team1LogoFileRef.current.value = "";
    if (team2LogoFileRef.current) team2LogoFileRef.current.value = "";
    setFormData({
      title: "",
      tournament: "Live Cricket Series",
      matchFormat: "T20",
      venue: "",
      startTime: new Date().toISOString().slice(0, 16),
      status: "LIVE",
      currentStatusText: "",
      streamUrl: "",
      backupStreamUrl: "",
      streamType: "auto",
      banner: "",
      isFeatured: true,
      isPremium: false,
      order: 0,
      isActive: true,
      team1Name: "",
      team1ShortName: "",
      team1Logo: "",
      team1Score: "",
      team2Name: "",
      team2ShortName: "",
      team2Logo: "",
      team2Score: "",
      toss: "",
      target: 0,
    });
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (match) => {
    setEditingMatch(match);
    setFiles({ bannerFile: null, team1LogoFile: null, team2LogoFile: null });
    setPreviews({
      banner: match.banner || null,
      team1Logo: match.team1?.logo || null,
      team2Logo: match.team2?.logo || null,
    });
    if (bannerFileRef.current) bannerFileRef.current.value = "";
    if (team1LogoFileRef.current) team1LogoFileRef.current.value = "";
    if (team2LogoFileRef.current) team2LogoFileRef.current.value = "";
    setFormData({
      title: match.title || "",
      tournament: match.tournament || "",
      matchFormat: match.matchFormat || "T20",
      venue: match.venue || "",
      startTime: match.startTime ? new Date(match.startTime).toISOString().slice(0, 16) : "",
      status: match.status || "LIVE",
      currentStatusText: match.currentStatusText || "",
      streamUrl: match.streamUrl || "",
      backupStreamUrl: match.backupStreamUrl || "",
      streamType: match.streamType || "auto",
      banner: match.banner || "",
      isFeatured: !!match.isFeatured,
      isPremium: !!match.isPremium,
      order: match.order || 0,
      isActive: match.isActive !== false,
      team1Name: match.team1?.name || "",
      team1ShortName: match.team1?.shortName || "",
      team1Logo: match.team1?.logo || "",
      team1Score: match.team1?.score || "",
      team2Name: match.team2?.name || "",
      team2ShortName: match.team2?.shortName || "",
      team2Logo: match.team2?.logo || "",
      team2Score: match.team2?.score || "",
      toss: match.toss || "",
      target: match.target || 0,
    });
    setShowModal(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter a match title", "error");
      return;
    }
    if (!formData.streamUrl.trim()) {
      showToast("Please enter a live stream URL", "error");
      return;
    }
    if (!formData.team1Name.trim() || !formData.team2Name.trim()) {
      showToast("Both team names are required", "error");
      return;
    }

    setSaving(true);
    try {
      const hasFiles = !!(files.bannerFile || files.team1LogoFile || files.team2LogoFile);

      let payload;
      let headers = {};

      if (hasFiles) {
        payload = new FormData();
        Object.keys(formData).forEach((key) => {
          if (formData[key] !== undefined && formData[key] !== null) {
            payload.append(key, formData[key]);
          }
        });
        if (files.bannerFile) payload.append("bannerFile", files.bannerFile);
        if (files.team1LogoFile) payload.append("team1LogoFile", files.team1LogoFile);
        if (files.team2LogoFile) payload.append("team2LogoFile", files.team2LogoFile);
        headers["Content-Type"] = "multipart/form-data";
      } else {
        payload = { ...formData };
      }

      if (editingMatch) {
        await API.put(`/admin/live-matches/${editingMatch._id}`, payload, { headers });
        showToast("Match updated successfully!");
      } else {
        await API.post("/admin/live-matches", payload, { headers });
        showToast("Match created successfully!");
      }

      setShowModal(false);
      fetchMatches();
    } catch (err) {
      console.error("Save match error:", err);
      showToast(err.response?.data?.message || "Failed to save match", "error");
    } finally {
      setSaving(false);
    }
  };

  // Quick Status Switcher
  const handleQuickStatus = async (matchId, newStatus) => {
    try {
      await API.patch(`/admin/live-matches/${matchId}/status`, { status: newStatus });
      showToast(`Match status switched to ${newStatus}`);
      fetchMatches();
    } catch (err) {
      showToast(err.response?.data?.message || "Status update failed", "error");
    }
  };

  // Open Quick Score Modal
  const handleOpenQuickScore = (match) => {
    setScoreMatch(match);
    setScoreForm({
      team1Score: match.team1?.score || "",
      team2Score: match.team2?.score || "",
      currentStatusText: match.currentStatusText || "",
    });
    setShowScoreModal(true);
  };

  // Submit Quick Score
  const handleSaveQuickScore = async (e) => {
    e.preventDefault();
    if (!scoreMatch) return;
    try {
      await API.patch(`/admin/live-matches/${scoreMatch._id}/score`, scoreForm);
      showToast("Live scores updated!");
      setShowScoreModal(false);
      fetchMatches();
    } catch (err) {
      showToast(err.response?.data?.message || "Score update failed", "error");
    }
  };

  // Delete Match
  const handleDelete = async (matchId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await API.delete(`/admin/live-matches/${matchId}`);
      showToast("Match deleted successfully");
      fetchMatches();
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  // Copy Stream URL
  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Stream URL copied to clipboard!");
  };

  // ── LIVE MATCH SCORER & ACTIVITY CONSOLE HANDLERS ──

  // Open Console Modal
  const handleOpenLiveConsole = async (match) => {
    setConsoleLoading(true);
    try {
      const res = await API.get(`/admin/live-matches/${match._id}`);
      if (res.data?.success) {
        const m = res.data.match;
        setConsoleMatch(m);
        setConsoleTab("SCORER");
        setScorecardForm({
          currentInnings: m.currentInnings || 1,
          battingTeam: m.battingTeam || "team1",
          bowlingTeam: m.bowlingTeam || "team2",
          target: m.target || 0,
          crr: m.crr || "0.00",
          rrr: m.rrr || "0.00",
          toss: m.toss || "",
          team1Score: m.team1?.score || "",
          team2Score: m.team2?.score || "",
          currentStatusText: m.currentStatusText || "",
        });
        setShowConsoleModal(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load match console", "error");
    } finally {
      setConsoleLoading(false);
    }
  };

  // Close In-Page Console and Return to Matches List
  const handleCloseConsole = () => {
    setShowConsoleModal(false);
    fetchMatches();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Refresh Console Data
  const refreshConsoleData = async () => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.get(`/admin/live-matches/${consoleMatch._id}`);
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
      }
    } catch (err) {
      console.warn("Could not refresh match:", err);
    }
  };

  // Real-time polling while console modal is open (keeps scores synced live)
  useEffect(() => {
    if (!showConsoleModal || !consoleMatch?._id) return;
    const consoleTimer = setInterval(() => {
      refreshConsoleData();
    }, 4000);
    return () => clearInterval(consoleTimer);
  }, [showConsoleModal, consoleMatch?._id]);

  // 1-Click Record Ball Action (Runs, Extras)
  const handleRecordBall = async (action, runs = 0, extraType = null) => {
    if (!consoleMatch?._id) return;
    try {
      const payload = { action, runs, extraType };
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, payload);
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        // Also update local matches list state
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(
          res.data.ballBadge
            ? `Recorded ball: ${res.data.ballBadge}`
            : res.data.message || "Ball recorded!"
        );
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to record ball", "error");
    }
  };

  // Swap Strike
  const handleSwapStrike = async () => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "SWAP_STRIKE",
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        showToast("Strike swapped between batsmen!");
      }
    } catch (err) {
      showToast("Failed to swap strike", "error");
    }
  };

  // Select Crease Player (Striker, Non-Striker, Bowler) from Dropdown
  const handleCreaseSelect = async (role, playerName) => {
    if (!consoleMatch?._id || !playerName) return;

    if (playerName === "__custom__") {
      setCustomCreaseRole(role);
      setCustomCreaseName("");
      setShowCustomCreaseModal(true);
      return;
    }

    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "SELECT_CREASE_PLAYER",
        role,
        playerName,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(
          `${role === "striker" ? "Striker" : role === "nonStriker" ? "Non-Striker" : "Bowler"} set to ${playerName}`
        );
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update player", "error");
    }
  };

  // Confirm Custom Crease Player Modal (Clean in-app popup - NO BROWSER PROMPT)
  const handleConfirmCustomCreasePlayer = async (e) => {
    if (e) e.preventDefault();
    if (!consoleMatch?._id || !customCreaseName.trim()) return;
    const pName = customCreaseName.trim();
    setShowCustomCreaseModal(false);
    await handleCreaseSelect(customCreaseRole, pName);
  };

  // Undo Last Ball Action
  const handleUndoBall = async () => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "UNDO",
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast("↩ Last ball undone successfully!");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "No previous ball to undo", "error");
    }
  };

  // Clear Over Balls
  const handleClearOver = async () => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "CLEAR_OVER",
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        showToast("Current over reset");
      }
    } catch (err) {
      showToast("Failed to reset over", "error");
    }
  };

  // Open Next Over Modal Dialog (Clean in-app popup - NO BROWSER PROMPT)
  const handleOpenNextOverModal = () => {
    if (!consoleMatch) return;
    const bowlingSquad =
      consoleMatch.battingTeam === "team2"
        ? consoleMatch.team1?.players || []
        : consoleMatch.team2?.players || [];

    const candidate =
      bowlingSquad.find((p) => p.name !== consoleMatch.currentBowler?.name)?.name ||
      bowlingSquad[0]?.name ||
      "";

    setNextOverBowler(candidate);
    setCustomNextOverBowler("");
    setRotateStrikeOnNewOver(false);
    setShowNextOverModal(true);
  };

  // Confirm Next Over from in-app Modal Dialog
  const handleConfirmNextOver = async (e) => {
    if (e) e.preventDefault();
    if (!consoleMatch?._id) return;

    const finalBowler =
      nextOverBowler === "__custom__" ? customNextOverBowler.trim() : nextOverBowler.trim();

    if (!finalBowler) {
      showToast("Please choose or enter a bowler name", "error");
      return;
    }

    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "NEW_OVER",
        bowlerName: finalBowler,
        rotateStrike: rotateStrikeOnNewOver,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        setShowNextOverModal(false);
        showToast(`🏁 Over started! Bowler: ${finalBowler}`);
      }
    } catch (err) {
      showToast("Failed to start new over", "error");
    }
  };

  // ── MakeTheBoard Stepper Handlers ──
  // 1. Adjust Runs (+1..+6 / -1..-6)
  const handleAdjustRuns = async (teamKey, delta) => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "ADJUST_RUNS",
        team: teamKey,
        runs: delta,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(`Runs updated: ${delta > 0 ? "+" + delta : delta} for ${teamKey === "team1" ? consoleMatch.team1?.name : consoleMatch.team2?.name}`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to adjust runs", "error");
    }
  };

  // 2. Adjust Legal Ball (+1 / -1)
  const handleAdjustBall = async (delta) => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "ADJUST_BALL",
        delta,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(`Ball ${delta > 0 ? "+1" : "-1"} updated`);
      }
    } catch (err) {
      showToast("Failed to adjust ball", "error");
    }
  };

  // 3. Adjust Wicket (+1 / -1)
  const handleAdjustWicket = async (delta) => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "ADJUST_WICKET",
        delta,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(`Wickets ${delta > 0 ? "+1" : "-1"} updated`);
      }
    } catch (err) {
      showToast("Failed to adjust wickets", "error");
    }
  };

  // 4. Adjust Full Over (+1 / -1)
  const handleAdjustOver = async (delta) => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "ADJUST_OVER",
        delta,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(`Over ${delta > 0 ? "+1" : "-1"} updated`);
      }
    } catch (err) {
      showToast("Failed to adjust over", "error");
    }
  };

  // 5. Switch Innings (1st / 2nd)
  const handleSwitchInnings = async (inningsNum) => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, {
        action: "SWITCH_INNINGS",
        innings: inningsNum,
      });
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast(`Switched to Innings ${inningsNum}`);
      }
    } catch (err) {
      showToast("Failed to switch innings", "error");
    }
  };

  // Auto-Fill Standard 11 Players for Teams
  const handleAutoSeedSquads = async () => {
    if (!consoleMatch?._id) return;

    const t1Name = (consoleMatch.team1?.name || "").toLowerCase();
    const t2Name = (consoleMatch.team2?.name || "").toLowerCase();

    const sampleIndia = [
      { name: "Rohit Sharma", role: "BATSMAN", isCaptain: true, isWicketKeeper: false },
      { name: "Shubman Gill", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Virat Kohli", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Suryakumar Yadav", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Rishabh Pant", role: "WICKET_KEEPER", isCaptain: false, isWicketKeeper: true },
      { name: "Hardik Pandya", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Ravindra Jadeja", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Axar Patel", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Kuldeep Yadav", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Jasprit Bumrah", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Mohammed Siraj", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
    ];

    const sampleAustralia = [
      { name: "Travis Head", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "David Warner", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Mitchell Marsh", role: "ALL_ROUNDER", isCaptain: true, isWicketKeeper: false },
      { name: "Glenn Maxwell", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Marcus Stoinis", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Tim David", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Alex Carey", role: "WICKET_KEEPER", isCaptain: false, isWicketKeeper: true },
      { name: "Pat Cummins", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Mitchell Starc", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Adam Zampa", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Josh Hazlewood", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
    ];

    const sampleEngland = [
      { name: "Jos Buttler", role: "WICKET_KEEPER", isCaptain: true, isWicketKeeper: true },
      { name: "Phil Salt", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Harry Brook", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Jonny Bairstow", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Moeen Ali", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Liam Livingstone", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Sam Curran", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Chris Jordan", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Jofra Archer", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Adil Rashid", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Reece Topley", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
    ];

    const sampleSouthAfrica = [
      { name: "Quinton de Kock", role: "WICKET_KEEPER", isCaptain: false, isWicketKeeper: true },
      { name: "Reeza Hendricks", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Aiden Markram", role: "BATSMAN", isCaptain: true, isWicketKeeper: false },
      { name: "Heinrich Klaasen", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "David Miller", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Tristan Stubbs", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Marco Jansen", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Keshav Maharaj", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Kagiso Rabada", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Anrich Nortje", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Tabraiz Shamsi", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
    ];

    const pickSquad = (name, fallback) => {
      if (name.includes("ind")) return sampleIndia;
      if (name.includes("aus")) return sampleAustralia;
      if (name.includes("eng")) return sampleEngland;
      if (name.includes("south") || name.includes("sa")) return sampleSouthAfrica;
      return fallback;
    };

    const s1 = pickSquad(t1Name, sampleIndia);
    const s2 = pickSquad(t2Name, sampleAustralia);

    try {
      const res = await API.put(`/admin/live-matches/${consoleMatch._id}/squads`, {
        team1Players: s1,
        team2Players: s2,
      });
      if (res.data?.success) {
        const bSquad = consoleMatch.battingTeam === "team2" ? s2 : s1;
        const bwSquad = consoleMatch.battingTeam === "team2" ? s1 : s2;

        const updatedMatch = {
          ...consoleMatch,
          team1: { ...consoleMatch.team1, players: s1 },
          team2: { ...consoleMatch.team2, players: s2 },
          striker: {
            ...consoleMatch.striker,
            name: consoleMatch.striker?.name || bSquad[0]?.name || "Batsman 1",
          },
          nonStriker: {
            ...consoleMatch.nonStriker,
            name: consoleMatch.nonStriker?.name || bSquad[1]?.name || "Batsman 2",
          },
          currentBowler: {
            ...consoleMatch.currentBowler,
            name:
              consoleMatch.currentBowler?.name ||
              bwSquad[bwSquad.length - 1]?.name ||
              "Bowler 1",
          },
        };
        setConsoleMatch(updatedMatch);
        showToast("⚡ Standard Playing XI (11 vs 11) populated & saved!");
        refreshConsoleData();
      }
    } catch (err) {
      showToast("Failed to populate squads", "error");
    }
  };

  // Open Wicket Dialog with intelligent pre-selections
  const handleOpenWicketDialog = () => {
    const bSquad =
      (consoleMatch?.battingTeam === "team2"
        ? consoleMatch?.team2?.players
        : consoleMatch?.team1?.players) || [];
    const fSquad =
      (consoleMatch?.battingTeam === "team2"
        ? consoleMatch?.team1?.players
        : consoleMatch?.team2?.players) || [];

    const currentNames = [
      (consoleMatch?.striker?.name || "").toLowerCase(),
      (consoleMatch?.nonStriker?.name || "").toLowerCase(),
    ];
    const nextCandidate =
      bSquad.find((p) => !currentNames.includes((p.name || "").toLowerCase()))?.name || "";

    setCustomFielderName("");
    setCustomNewPlayerName("");
    setWicketForm({
      wicketType: "caught",
      dismissedPlayer: consoleMatch?.striker?.name || bSquad[0]?.name || "",
      fielder: fSquad[0]?.name || "",
      newPlayer: nextCandidate,
    });
    setShowWicketDialog(true);
  };

  // Confirm Wicket
  const handleConfirmWicket = async (e) => {
    e.preventDefault();
    if (!consoleMatch?._id) return;

    const finalFielder =
      wicketForm.fielder === "__custom__" ? customFielderName.trim() : wicketForm.fielder;
    const finalNewPlayer =
      wicketForm.newPlayer === "__custom__" ? customNewPlayerName.trim() : wicketForm.newPlayer;

    try {
      const payload = {
        action: "WICKET",
        wicketType: wicketForm.wicketType,
        dismissedPlayer: wicketForm.dismissedPlayer,
        fielder: finalFielder,
        newPlayer: finalNewPlayer,
      };
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/record-ball`, payload);
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        setShowWicketDialog(false);
        showToast("🔴 WICKET recorded successfully!");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to record wicket", "error");
    }
  };

  // Post Custom Commentary
  const handlePostCommentary = async () => {
    if (!quickComment.trim() || !consoleMatch?._id) return;
    try {
      const res = await API.post(`/admin/live-matches/${consoleMatch._id}/commentary`, {
        text: quickComment.trim(),
        over: consoleMatch.innings1?.overs ? String(consoleMatch.innings1.overs) : "",
      });
      if (res.data?.success) {
        setConsoleMatch((prev) => ({
          ...prev,
          commentary: res.data.commentary,
          currentStatusText: quickComment.trim(),
        }));
        setQuickComment("");
        showToast("Live commentary posted!");
      }
    } catch (err) {
      showToast("Failed to post commentary", "error");
    }
  };

  // Add player to Squad
  const handleAddPlayer = () => {
    if (!newPlayer.name.trim()) {
      showToast("Please enter player name", "error");
      return;
    }
    const targetTeam = squadTeam;
    const currentList = consoleMatch[targetTeam]?.players || [];
    const updatedList = [
      ...currentList,
      {
        name: newPlayer.name.trim(),
        role: newPlayer.role,
        isCaptain: newPlayer.isCaptain,
        isWicketKeeper: newPlayer.isWicketKeeper,
      },
    ];

    setConsoleMatch((prev) => ({
      ...prev,
      [targetTeam]: {
        ...prev[targetTeam],
        players: updatedList,
      },
    }));

    setNewPlayer({ name: "", role: "BATSMAN", isCaptain: false, isWicketKeeper: false });
  };

  // Remove player from Squad
  const handleRemovePlayer = (teamKey, idx) => {
    const currentList = consoleMatch[teamKey]?.players || [];
    const updatedList = currentList.filter((_, i) => i !== idx);
    setConsoleMatch((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        players: updatedList,
      },
    }));
  };

  // Bulk import players (newline or comma separated)
  const handleBulkImport = () => {
    if (!bulkSquadText.trim()) return;
    const lines = bulkSquadText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const parsed = lines.map((name) => {
      let isCap = false;
      let isWk = false;
      let cleanName = name;
      if (cleanName.includes("(c)") || cleanName.includes("(C)")) {
        isCap = true;
        cleanName = cleanName.replace(/\([cC]\)/, "").trim();
      }
      if (cleanName.includes("(wk)") || cleanName.includes("(WK)")) {
        isWk = true;
        cleanName = cleanName.replace(/\([wW][kK]\)/, "").trim();
      }
      return {
        name: cleanName,
        role: "BATSMAN",
        isCaptain: isCap,
        isWicketKeeper: isWk,
      };
    });

    const targetTeam = squadTeam;
    const currentList = consoleMatch[targetTeam]?.players || [];
    setConsoleMatch((prev) => ({
      ...prev,
      [targetTeam]: {
        ...prev[targetTeam],
        players: [...currentList, ...parsed],
      },
    }));

    setBulkSquadText("");
    showToast(`Added ${parsed.length} players to ${consoleMatch[targetTeam]?.name}! Click Save Squads to persist.`);
  };

  // Save Squads to Database
  const handleSaveSquads = async () => {
    if (!consoleMatch?._id) return;
    try {
      const res = await API.put(`/admin/live-matches/${consoleMatch._id}/squads`, {
        team1Players: consoleMatch.team1?.players || [],
        team2Players: consoleMatch.team2?.players || [],
      });
      if (res.data?.success) {
        showToast("Squads & Playing XI saved successfully!");
        refreshConsoleData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save squads", "error");
    }
  };

  // Save Full Scorecard & Crease Overrides
  const handleSaveScorecard = async () => {
    if (!consoleMatch?._id) return;
    try {
      const payload = {
        ...scorecardForm,
        striker: consoleMatch.striker,
        nonStriker: consoleMatch.nonStriker,
        currentBowler: consoleMatch.currentBowler,
        innings1: consoleMatch.innings1,
        innings2: consoleMatch.innings2,
      };
      const res = await API.put(`/admin/live-matches/${consoleMatch._id}/scorecard`, payload);
      if (res.data?.success) {
        setConsoleMatch(res.data.match);
        setMatches((prev) =>
          prev.map((m) => (m._id === res.data.match._id ? { ...m, ...res.data.match } : m))
        );
        showToast("Scorecard settings saved!");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update scorecard", "error");
    }
  };

  return (
    <div className="live-matches-page">
      {!showConsoleModal && (
        <>
          {/* ── Page Header ── */}
      <div className="lm-header">
        <div className="lm-header-left">
          <div className="lm-title-row">
            <div className="lm-title-icon">
              <Radio className="pulse-red" size={24} />
            </div>
            <div>
              <h1 className="lm-title">Live Cricket Matches</h1>
              <p className="lm-subtitle">
                Broadcast live cricket streams, update real-time scores, manage fixtures, and stream URLs
              </p>
            </div>
          </div>
        </div>
        <div className="lm-header-actions">
          <button className="lm-btn-secondary" onClick={fetchMatches} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <button className="lm-btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add Live Match</span>
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="lm-stats-grid">
        <div className="lm-stat-card">
          <div className="lm-stat-icon total">
            <Tv size={22} />
          </div>
          <div>
            <div className="lm-stat-val">{stats.total}</div>
            <div className="lm-stat-lbl">Total Matches</div>
          </div>
        </div>

        <div className="lm-stat-card live-card">
          <div className="lm-stat-icon live">
            <span className="live-ping" />
            <Radio size={22} />
          </div>
          <div>
            <div className="lm-stat-val text-red">{stats.live}</div>
            <div className="lm-stat-lbl">Live Now Streaming</div>
          </div>
        </div>

        <div className="lm-stat-card">
          <div className="lm-stat-icon upcoming">
            <Clock size={22} />
          </div>
          <div>
            <div className="lm-stat-val text-amber">{stats.upcoming}</div>
            <div className="lm-stat-lbl">Upcoming Matches</div>
          </div>
        </div>

        <div className="lm-stat-card">
          <div className="lm-stat-icon completed">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="lm-stat-val text-emerald">{stats.completed}</div>
            <div className="lm-stat-lbl">Completed Matches</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="lm-controls-bar">
        {/* Status Tabs */}
        <div className="lm-tabs">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              className={`lm-tab-btn ${activeTab === st ? "active" : ""}`}
              onClick={() => {
                setActiveTab(st);
                setCurrentPage(1);
              }}
            >
              {st === "LIVE" && <span className="tab-live-dot" />}
              {st === "ALL" ? "All Matches" : st === "LIVE" ? "Live Now" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search & Format Filter */}
        <div className="lm-search-row">
          <div className="lm-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search team, tournament, venue..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="lm-select"
            value={selectedFormat}
            onChange={(e) => {
              setSelectedFormat(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Formats</option>
            {FORMAT_OPTIONS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Matches Grid ── */}
      {loading ? (
        <div className="lm-loading">
          <RefreshCw size={32} className="spin text-orange" />
          <p>Loading live cricket matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="lm-empty-state">
          <Radio size={48} className="text-gray" />
          <h3>No Live Matches Found</h3>
          <p>Create your first live match stream or change filters above.</p>
          <button className="lm-btn-primary mt-4" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Live Match
          </button>
        </div>
      ) : (
        <div className="lm-grid">
          {matches.map((match) => (
            <div key={match._id} className={`lm-match-card ${match.status === "LIVE" ? "is-live-card" : ""}`}>
              {/* Optional Banner Strip */}
              {match.banner && (
                <div className="lm-card-banner-strip">
                  <img
                    src={match.banner}
                    alt={match.title}
                    className="lm-card-banner-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Card Header */}
              <div className="lm-card-top">
                <div className="lm-tournament-meta">
                  <span className="lm-format-badge">{match.matchFormat}</span>
                  <span className="lm-tournament-name">{match.tournament}</span>
                </div>

                <div className="lm-status-actions">
                  {match.status === "LIVE" ? (
                    <span className="lm-badge-live">
                      <span className="live-blink" /> LIVE
                    </span>
                  ) : match.status === "UPCOMING" ? (
                    <span className="lm-badge-upcoming">UPCOMING</span>
                  ) : (
                    <span className="lm-badge-completed">COMPLETED</span>
                  )}
                </div>
              </div>

              {/* Title & Venue */}
              <div className="lm-card-title-wrap">
                <h3 className="lm-card-title">{match.title}</h3>
                {match.venue && (
                  <div className="lm-venue">
                    <MapPin size={13} />
                    <span>{match.venue}</span>
                  </div>
                )}
              </div>

              {/* Match Teams & Score Board */}
              <div className="lm-scoreboard">
                {/* Team 1 */}
                <div className="lm-team-row">
                  <div className="lm-team-info">
                    {match.team1?.logo ? (
                      <img src={match.team1.logo} alt={match.team1.name} className="lm-team-logo" />
                    ) : (
                      <div className="lm-team-logo-placeholder">
                        {match.team1?.shortName || match.team1?.name?.charAt(0) || "T1"}
                      </div>
                    )}
                    <div>
                      <div className="lm-team-name">{match.team1?.name}</div>
                      <div className="lm-team-short">{match.team1?.shortName}</div>
                    </div>
                  </div>
                  <div className="lm-team-score">{match.team1?.score || "—"}</div>
                </div>

                <div className="lm-score-divider">
                  <span className="vs-tag">VS</span>
                </div>

                {/* Team 2 */}
                <div className="lm-team-row">
                  <div className="lm-team-info">
                    {match.team2?.logo ? (
                      <img src={match.team2.logo} alt={match.team2.name} className="lm-team-logo" />
                    ) : (
                      <div className="lm-team-logo-placeholder">
                        {match.team2?.shortName || match.team2?.name?.charAt(0) || "T2"}
                      </div>
                    )}
                    <div>
                      <div className="lm-team-name">{match.team2?.name}</div>
                      <div className="lm-team-short">{match.team2?.shortName}</div>
                    </div>
                  </div>
                  <div className="lm-team-score">{match.team2?.score || "—"}</div>
                </div>
              </div>

              {/* Live Status Commentary */}
              {match.currentStatusText && (
                <div className="lm-status-text">
                  <Zap size={14} className="zap-icon" />
                  <span>{match.currentStatusText}</span>
                </div>
              )}

              {/* Stream URL & Metadata */}
              <div className="lm-stream-info">
                <div className="lm-stream-url-box">
                  <span className="stream-label">Stream:</span>
                  <span className="stream-url-text" title={match.streamUrl}>
                    {match.streamUrl}
                  </span>
                  <button
                    className="lm-copy-btn"
                    onClick={() => handleCopyUrl(match.streamUrl, match._id)}
                    title="Copy stream URL"
                  >
                    {copiedId === match._id ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="lm-meta-pills">
                  <span className="lm-pill">
                    <Eye size={12} /> {match.viewersCount || 0} watching
                  </span>
                  <span className="lm-pill">
                    <Calendar size={12} />{" "}
                    {new Date(match.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`lm-pill ${match.streamType}`}>{match.streamType.toUpperCase()}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="lm-card-footer">
                <div className="lm-quick-status-btn-group">
                  {match.status !== "LIVE" && (
                    <button
                      className="lm-action-btn live-btn"
                      onClick={() => handleQuickStatus(match._id, "LIVE")}
                      title="Make Match Live"
                    >
                      <Radio size={14} /> Live
                    </button>
                  )}
                  {match.status === "LIVE" && (
                    <button
                      className="lm-action-btn end-btn"
                      onClick={() => handleQuickStatus(match._id, "COMPLETED")}
                      title="End Match"
                    >
                      <CheckCircle size={14} /> End
                    </button>
                  )}
                  {/* Dedicated 🔴 Live Scorer & Activity Console Button */}
                  <button
                    className="lm-action-btn console-btn"
                    onClick={() => handleOpenLiveConsole(match)}
                    title="Open Live Match Scorer & Ball-by-Ball Activity Console"
                  >
                    <Activity size={14} /> Scorer
                  </button>
                  <button
                    className="lm-action-btn score-btn"
                    onClick={() => handleOpenQuickScore(match)}
                    title="Update Live Score"
                  >
                    <Zap size={14} /> Score
                  </button>
                </div>

                <div className="lm-admin-btns">
                  <button
                    className="lm-icon-btn preview"
                    onClick={() => setPreviewStream(match)}
                    title="Preview Stream Player"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    className="lm-icon-btn edit"
                    onClick={() => handleOpenEdit(match)}
                    title="Edit Full Match"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="lm-icon-btn delete"
                    onClick={() => handleDelete(match._id, match.title)}
                    title="Delete Match"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalMatches}
        itemsPerPage={limit}
        onPageChange={(p) => setCurrentPage(p)}
      />
        </>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="lm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lm-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lm-modal-header">
              <div className="lm-modal-title">
                <Radio size={22} className="text-red" />
                <h3>{editingMatch ? "Edit Live Match" : "Add New Live Cricket Match"}</h3>
              </div>
              <button className="lm-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="lm-modal-form">
              <div className="lm-form-scrollable">
                {/* Match Title & Tournament */}
                <div className="lm-form-row two-col">
                  <div className="lm-form-group">
                    <label>Match Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. India vs Australia - 2nd T20I"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="lm-form-group">
                    <label>Tournament / League *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ICC T20 World Cup 2026"
                      value={formData.tournament}
                      onChange={(e) => setFormData({ ...formData, tournament: e.target.value })}
                    />
                  </div>
                </div>

                {/* Format, Status & Venue */}
                <div className="lm-form-row three-col">
                  <div className="lm-form-group">
                    <label>Format</label>
                    <select
                      value={formData.matchFormat}
                      onChange={(e) => setFormData({ ...formData, matchFormat: e.target.value })}
                    >
                      {FORMAT_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lm-form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="LIVE">LIVE NOW</option>
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>

                  <div className="lm-form-group">
                    <label>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Venue */}
                <div className="lm-form-group">
                  <label>Venue / Stadium</label>
                  <input
                    type="text"
                    placeholder="e.g. Wankhede Stadium, Mumbai"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>

                {/* Team 1 Details */}
                <div className="lm-section-divider">
                  <span>Team 1 Details</span>
                </div>
                <div className="lm-form-row three-col">
                  <div className="lm-form-group">
                    <label>Team 1 Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. India"
                      value={formData.team1Name}
                      onChange={(e) => setFormData({ ...formData, team1Name: e.target.value })}
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Short Code</label>
                    <input
                      type="text"
                      placeholder="e.g. IND"
                      value={formData.team1ShortName}
                      onChange={(e) => setFormData({ ...formData, team1ShortName: e.target.value })}
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Live Score</label>
                    <input
                      type="text"
                      placeholder="e.g. 185/4 (20 ov)"
                      value={formData.team1Score}
                      onChange={(e) => setFormData({ ...formData, team1Score: e.target.value })}
                    />
                  </div>
                </div>

                {/* Team 1 Logo Input + File Upload */}
                <div className="lm-logo-field-container">
                  <label>Team 1 Logo (URL or Upload File)</label>
                  <div className="lm-logo-controls-row">
                    <input
                      type="text"
                      placeholder="https://... logo image URL or choose file →"
                      value={formData.team1Logo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, team1Logo: val });
                        if (!files.team1LogoFile) {
                          setPreviews((prev) => ({ ...prev, team1Logo: val || null }));
                        }
                      }}
                      className="lm-logo-url-input"
                    />
                    <input
                      type="file"
                      ref={team1LogoFileRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={(e) => handleFileSelect("team1Logo", e)}
                    />
                    <button
                      type="button"
                      className="lm-upload-mini-btn"
                      onClick={() => team1LogoFileRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>{files.team1LogoFile ? "Change Logo" : "Upload Logo"}</span>
                    </button>
                  </div>

                  {/* Team 1 Logo Preview */}
                  {(previews.team1Logo || formData.team1Logo) && (
                    <div className="lm-thumb-preview-chip">
                      <img
                        src={previews.team1Logo || formData.team1Logo}
                        alt="Team 1 Logo Preview"
                        className="lm-thumb-preview-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span className="lm-thumb-meta">
                        {files.team1LogoFile ? `File: ${files.team1LogoFile.name}` : "Active URL Preview"}
                      </span>
                      <button
                        type="button"
                        className="lm-thumb-del-btn"
                        onClick={() => handleClearFile("team1Logo")}
                        title="Remove Logo"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Team 2 Details */}
                <div className="lm-section-divider">
                  <span>Team 2 Details</span>
                </div>
                <div className="lm-form-row three-col">
                  <div className="lm-form-group">
                    <label>Team 2 Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Australia"
                      value={formData.team2Name}
                      onChange={(e) => setFormData({ ...formData, team2Name: e.target.value })}
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Short Code</label>
                    <input
                      type="text"
                      placeholder="e.g. AUS"
                      value={formData.team2ShortName}
                      onChange={(e) => setFormData({ ...formData, team2ShortName: e.target.value })}
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Live Score</label>
                    <input
                      type="text"
                      placeholder="e.g. 142/6 (16.2 ov)"
                      value={formData.team2Score}
                      onChange={(e) => setFormData({ ...formData, team2Score: e.target.value })}
                    />
                  </div>
                </div>

                {/* Team 2 Logo Input + File Upload */}
                <div className="lm-logo-field-container">
                  <label>Team 2 Logo (URL or Upload File)</label>
                  <div className="lm-logo-controls-row">
                    <input
                      type="text"
                      placeholder="https://... logo image URL or choose file →"
                      value={formData.team2Logo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, team2Logo: val });
                        if (!files.team2LogoFile) {
                          setPreviews((prev) => ({ ...prev, team2Logo: val || null }));
                        }
                      }}
                      className="lm-logo-url-input"
                    />
                    <input
                      type="file"
                      ref={team2LogoFileRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={(e) => handleFileSelect("team2Logo", e)}
                    />
                    <button
                      type="button"
                      className="lm-upload-mini-btn"
                      onClick={() => team2LogoFileRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>{files.team2LogoFile ? "Change Logo" : "Upload Logo"}</span>
                    </button>
                  </div>

                  {/* Team 2 Logo Preview */}
                  {(previews.team2Logo || formData.team2Logo) && (
                    <div className="lm-thumb-preview-chip">
                      <img
                        src={previews.team2Logo || formData.team2Logo}
                        alt="Team 2 Logo Preview"
                        className="lm-thumb-preview-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span className="lm-thumb-meta">
                        {files.team2LogoFile ? `File: ${files.team2LogoFile.name}` : "Active URL Preview"}
                      </span>
                      <button
                        type="button"
                        className="lm-thumb-del-btn"
                        onClick={() => handleClearFile("team2Logo")}
                        title="Remove Logo"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Match Toss & Target */}
                <div className="lm-form-row two-col">
                  <div className="lm-form-group">
                    <label>Toss Decision / Details</label>
                    <input
                      type="text"
                      placeholder="e.g. India won the toss and elected to bat"
                      value={formData.toss}
                      onChange={(e) => setFormData({ ...formData, toss: e.target.value })}
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Target Runs (2nd Innings)</label>
                    <input
                      type="number"
                      placeholder="e.g. 210"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Stream URLs */}
                <div className="lm-section-divider">
                  <span>Stream Configuration</span>
                </div>
                <div className="lm-form-group">
                  <label>Primary Live Stream URL (HLS / m3u8 / MP4 / YouTube) *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://.../stream.m3u8 or https://www.youtube.com/watch?v=..."
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                  />
                </div>

                <div className="lm-form-row two-col">
                  <div className="lm-form-group">
                    <label>Backup Stream URL (Optional Failover)</label>
                    <input
                      type="text"
                      placeholder="https://.../backup.m3u8"
                      value={formData.backupStreamUrl}
                      onChange={(e) => setFormData({ ...formData, backupStreamUrl: e.target.value })}
                    />
                  </div>

                  <div className="lm-form-group">
                    <label>Stream Type</label>
                    <select
                      value={formData.streamType}
                      onChange={(e) => setFormData({ ...formData, streamType: e.target.value })}
                    >
                      <option value="auto">Auto-detect (Recommended)</option>
                      <option value="hls">HLS (.m3u8 stream)</option>
                      <option value="mp4">Direct MP4 Video</option>
                      <option value="youtube">YouTube Embed / Live</option>
                      <option value="embed">Generic Iframe Embed</option>
                    </select>
                  </div>
                </div>

                {/* Banner Poster URL or File Upload */}
                <div className="lm-form-group">
                  <label>Match Banner Poster Image (URL or Upload File)</label>
                  <div className="lm-logo-controls-row">
                    <input
                      type="text"
                      placeholder="https://... 16:9 banner poster URL or choose file →"
                      value={formData.banner}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, banner: val });
                        if (!files.bannerFile) {
                          setPreviews((prev) => ({ ...prev, banner: val || null }));
                        }
                      }}
                      className="lm-logo-url-input"
                    />
                    <input
                      type="file"
                      ref={bannerFileRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={(e) => handleFileSelect("banner", e)}
                    />
                    <button
                      type="button"
                      className="lm-upload-mini-btn"
                      onClick={() => bannerFileRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>{files.bannerFile ? "Change Banner" : "Upload Banner"}</span>
                    </button>
                  </div>

                  {/* Banner Preview Card */}
                  {(previews.banner || formData.banner) && (
                    <div className="lm-banner-preview-box">
                      <img
                        src={previews.banner || formData.banner}
                        alt="Match Banner Preview"
                        className="lm-banner-preview-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="lm-banner-preview-meta">
                        <span>{files.bannerFile ? `File: ${files.bannerFile.name}` : "Active Poster Preview"}</span>
                        <button
                          type="button"
                          className="lm-banner-remove-btn"
                          onClick={() => handleClearFile("banner")}
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Text / Commentary */}
                <div className="lm-form-group">
                  <label>Current Status Note / Ticker Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Rain stops play | Needs 24 runs in 18 balls"
                    value={formData.currentStatusText}
                    onChange={(e) => setFormData({ ...formData, currentStatusText: e.target.value })}
                  />
                </div>

                {/* Toggles */}
                <div className="lm-toggles-row">
                  <label className="lm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    />
                    <span>Feature on Homepage Hero & Cards</span>
                  </label>

                  <label className="lm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active (Visible on website & app)</span>
                  </label>
                </div>
              </div>

              <div className="lm-modal-footer">
                <button type="button" className="lm-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="lm-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingMatch ? "Update Match" : "Publish Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 🔴 PRO LIVE MATCH SCORER & ACTIVITY CONSOLE (DYNAMIC IN-PAGE VIEW) ── */}
      {showConsoleModal && consoleMatch && (
        <div className="lm-scorer-page-view">
          {/* Top Dedicated Scorer Header Bar */}
          <div className="lm-scorer-top-bar">
            <div className="lm-scorer-bar-left">
              <button
                type="button"
                className="lm-back-to-matches-btn"
                onClick={handleCloseConsole}
                title="Return to Live Matches list"
              >
                <ArrowLeft size={17} />
                <span>Back to Matches List</span>
              </button>
              <div className="lm-scorer-badge-row">
                <span className="lm-live-badge-glow">
                  <span className="live-blink" /> LIVE CONSOLE
                </span>
                <span className="lm-console-match-fmt">{consoleMatch.matchFormat}</span>
                <span className="lm-console-tour">{consoleMatch.tournament}</span>
                {consoleMatch.venue && (
                  <span className="lm-console-venue-pill">
                    <MapPin size={12} className="inline mr-1" />
                    {consoleMatch.venue}
                  </span>
                )}
              </div>
            </div>

            <div className="lm-scorer-bar-right">
              <button
                type="button"
                className="lm-btn-refresh-scorer"
                onClick={refreshConsoleData}
                title="Refresh Live Data"
              >
                <RefreshCw size={15} className={consoleLoading ? "spin" : ""} />
                <span>Refresh Live</span>
              </button>
              <button
                type="button"
                className="lm-btn-close-scorer"
                onClick={handleCloseConsole}
                title="Close Console & Back to List"
              >
                <X size={17} />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Symmetrical & Balanced Match Scoreboard Card */}
          <div className="lm-console-score-banner">
            <div className="lm-score-banner-team left">
              <div className="team-flag-name">
                {consoleMatch.team1?.logo && (
                  <img src={consoleMatch.team1.logo} alt="" className="mini-flag" />
                )}
                <span className="team-name-text">{consoleMatch.team1?.name}</span>
                <span className="team-short">({consoleMatch.team1?.shortName || "T1"})</span>
                {consoleMatch.battingTeam === "team1" && (
                  <span className="batting-indicator">🏏 BATTING</span>
                )}
              </div>
              <div className="team-runs-display">{consoleMatch.team1?.score || "0/0 (0.0 ov)"}</div>
            </div>

            <div className="lm-score-banner-mid">
              <div className="mid-match-title">{consoleMatch.title}</div>
              <div className="mid-vs-row">
                <span className="mid-vs">VS</span>
                <span className="mid-rate-chip">CRR: <strong>{consoleMatch.crr || "0.00"}</strong></span>
                {consoleMatch.currentInnings === 2 && (
                  <>
                    <span className="mid-rate-chip">RRR: <strong>{consoleMatch.rrr || "0.00"}</strong></span>
                    <span className="mid-rate-chip target">Target: <strong>{consoleMatch.target || 0}</strong></span>
                  </>
                )}
              </div>
              {consoleMatch.toss && <div className="mid-toss">{consoleMatch.toss}</div>}
            </div>

            <div className="lm-score-banner-team right">
              <div className="team-flag-name">
                {consoleMatch.battingTeam === "team2" && (
                  <span className="batting-indicator">🏏 BATTING</span>
                )}
                <span className="team-short">({consoleMatch.team2?.shortName || "T2"})</span>
                <span className="team-name-text">{consoleMatch.team2?.name}</span>
                {consoleMatch.team2?.logo && (
                  <img src={consoleMatch.team2.logo} alt="" className="mini-flag" />
                )}
              </div>
              <div className="team-runs-display">{consoleMatch.team2?.score || "Yet to bat"}</div>
            </div>
          </div>

            {/* Console Navigation Tabs */}
            <div className="lm-console-nav-tabs">
              <button
                className={`lm-console-nav-btn ${consoleTab === "SCORER" ? "active" : ""}`}
                onClick={() => setConsoleTab("SCORER")}
              >
                <Radio size={16} /> 🔴 Live Ball Scorer
              </button>
              <button
                className={`lm-console-nav-btn ${consoleTab === "SQUADS" ? "active" : ""}`}
                onClick={() => setConsoleTab("SQUADS")}
              >
                <Users size={16} /> Squads & Playing XI ({consoleMatch.team1?.players?.length || 0} vs{" "}
                {consoleMatch.team2?.players?.length || 0})
              </button>
              <button
                className={`lm-console-nav-btn ${consoleTab === "SCORECARD" ? "active" : ""}`}
                onClick={() => setConsoleTab("SCORECARD")}
              >
                <Sliders size={16} /> Scorecard & Inning Settings
              </button>
            </div>

            {/* ── TAB 1: LIVE BALL SCORER & ACTIVITY ── */}
            {consoleTab === "SCORER" && (() => {
              const battingSquad =
                (consoleMatch.battingTeam === "team2"
                  ? consoleMatch.team2?.players
                  : consoleMatch.team1?.players) || [];
              const bowlingSquad =
                (consoleMatch.battingTeam === "team2"
                  ? consoleMatch.team1?.players
                  : consoleMatch.team2?.players) || [];
              const bowlingTeamObj =
                consoleMatch.battingTeam === "team2" ? consoleMatch.team1 : consoleMatch.team2;

              const currentOverBalls = consoleMatch.currentOverBalls || [];
              const legalBallsInCurrentOver = currentOverBalls.filter(
                (b) => !b.toLowerCase().includes("wd") && !b.toLowerCase().includes("nb")
              ).length;
              const isOverFinished = legalBallsInCurrentOver >= 6;

              const activeInningsObj =
                consoleMatch.currentInnings === 2 ? consoleMatch.innings2 : consoleMatch.innings1;
              const currentOversDisplay =
                activeInningsObj?.overs !== undefined
                  ? activeInningsObj.overs
                  : (() => {
                      const activeTeam =
                        consoleMatch.battingTeam === "team2" ? consoleMatch.team2 : consoleMatch.team1;
                      const m = (activeTeam?.score || "").match(/\(([\d.]+)\s*ov\)/i);
                      return m ? m[1] : "0.0";
                    })();

              const currentWicketsDisplay =
                activeInningsObj?.wickets !== undefined
                  ? activeInningsObj.wickets
                  : (() => {
                      const activeTeam =
                        consoleMatch.battingTeam === "team2" ? consoleMatch.team2 : consoleMatch.team1;
                      const m = (activeTeam?.score || "").match(/\/(\d+)/);
                      return m ? parseInt(m[1], 10) : 0;
                    })();

              return (
                <div className="lm-cockpit-workspace">
                  {/* Empty Squad Helper Alert */}
                  {battingSquad.length === 0 && bowlingSquad.length === 0 && (
                    <div className="lm-empty-squad-alert">
                      <div className="empty-alert-text">
                        <AlertTriangle size={16} className="text-amber" />
                        <span>Squads are empty for this match. Click to load standard 11 players for both teams:</span>
                      </div>
                      <button
                        type="button"
                        className="lm-btn-seed-inline"
                        onClick={handleAutoSeedSquads}
                      >
                        <Zap size={14} /> ⚡ Auto-Fill 11 Players for Teams
                      </button>
                    </div>
                  )}

                  {/* Over Completed Notification Strip */}
                  {isOverFinished && (
                    <div className="lm-over-complete-banner">
                      <div className="over-complete-left">
                        <CheckCircle size={18} className="text-emerald" />
                        <div className="over-complete-title">
                          🎉 Over Completed ({legalBallsInCurrentOver}/6 Legal Deliveries)! Strike automatically rotated.
                        </div>
                      </div>
                      <div className="over-complete-actions">
                        <button
                          type="button"
                          className="btn-start-next-over"
                          onClick={handleOpenNextOverModal}
                        >
                          🏁 Choose Bowler & Start Next Over ➔
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1. ACTIVE CREASE & BOWLER CONTAINER (3 EQUAL COLUMNS - NO UNWANTED GAP) */}
                  <div className="lm-crease-container">
                    {/* Striker */}
                    <div className="lm-crease-card striker-card">
                      <div className="crease-card-label">
                        <div className="crease-role-title">
                          <span className="crease-role striker">🏏 STRIKER (ON STRIKE)</span>
                          <button
                            type="button"
                            className="crease-inline-swap-btn"
                            onClick={handleSwapStrike}
                            title="Click to Swap Strike with Non-Striker (⇄)"
                          >
                            <ArrowRightLeft size={13} />
                            <span>Swap</span>
                          </button>
                        </div>
                        <span className="crease-sr">SR: {consoleMatch.striker?.strikeRate || 0}</span>
                      </div>
                      <div className="crease-player-select">
                        <select
                          className="crease-select striker"
                          value={consoleMatch.striker?.name || ""}
                          onChange={(e) => handleCreaseSelect("striker", e.target.value)}
                        >
                          <option value="" disabled>-- Select Striker Batsman --</option>
                          {consoleMatch.striker?.name &&
                            !battingSquad.some((p) => p.name === consoleMatch.striker?.name) && (
                              <option value={consoleMatch.striker.name}>{consoleMatch.striker.name}</option>
                            )}
                          {battingSquad.map((p, idx) => (
                            <option key={idx} value={p.name}>
                              {p.name} {p.isCaptain ? "(c)" : ""} {p.isWicketKeeper ? "(wk)" : ""}
                            </option>
                          ))}
                          <option value="__custom__">➕ Enter Custom Name...</option>
                        </select>
                      </div>
                      <div className="crease-stats-row">
                        <div className="crease-stat-item highlight">
                          <span className="stat-label">Runs</span>
                          <span className="stat-num">{consoleMatch.striker?.runs || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">Balls</span>
                          <span className="stat-num">{consoleMatch.striker?.balls || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">4s</span>
                          <span className="stat-num">{consoleMatch.striker?.fours || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">6s</span>
                          <span className="stat-num">{consoleMatch.striker?.sixes || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Non-Striker */}
                    <div className="lm-crease-card">
                      <div className="crease-card-label">
                        <div className="crease-role-title">
                          <span className="crease-role">🏃 NON-STRIKER</span>
                          <button
                            type="button"
                            className="crease-inline-swap-btn"
                            onClick={handleSwapStrike}
                            title="Click to Bring on Strike (⇄)"
                          >
                            <ArrowRightLeft size={13} />
                            <span>Take Strike</span>
                          </button>
                        </div>
                        <span className="crease-sr">SR: {consoleMatch.nonStriker?.strikeRate || 0}</span>
                      </div>
                      <div className="crease-player-select">
                        <select
                          className="crease-select"
                          value={consoleMatch.nonStriker?.name || ""}
                          onChange={(e) => handleCreaseSelect("nonStriker", e.target.value)}
                        >
                          <option value="" disabled>-- Select Non-Striker Batsman --</option>
                          {consoleMatch.nonStriker?.name &&
                            !battingSquad.some((p) => p.name === consoleMatch.nonStriker?.name) && (
                              <option value={consoleMatch.nonStriker.name}>
                                {consoleMatch.nonStriker.name}
                              </option>
                            )}
                          {battingSquad.map((p, idx) => (
                            <option key={idx} value={p.name}>
                              {p.name} {p.isCaptain ? "(c)" : ""} {p.isWicketKeeper ? "(wk)" : ""}
                            </option>
                          ))}
                          <option value="__custom__">➕ Enter Custom Name...</option>
                        </select>
                      </div>
                      <div className="crease-stats-row">
                        <div className="crease-stat-item highlight">
                          <span className="stat-label">Runs</span>
                          <span className="stat-num">{consoleMatch.nonStriker?.runs || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">Balls</span>
                          <span className="stat-num">{consoleMatch.nonStriker?.balls || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">4s</span>
                          <span className="stat-num">{consoleMatch.nonStriker?.fours || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">6s</span>
                          <span className="stat-num">{consoleMatch.nonStriker?.sixes || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Current Bowler */}
                    <div className="lm-crease-card bowler-card">
                      <div className="crease-card-label">
                        <span className="crease-role">🎯 CURRENT BOWLER</span>
                        <span className="crease-sr">Eco: {consoleMatch.currentBowler?.economy || 0}</span>
                      </div>
                      <div className="crease-player-select">
                        <select
                          className="crease-select bowler"
                          value={consoleMatch.currentBowler?.name || ""}
                          onChange={(e) => handleCreaseSelect("bowler", e.target.value)}
                        >
                          <option value="" disabled>-- Select Current Bowler --</option>
                          {consoleMatch.currentBowler?.name &&
                            !bowlingSquad.some((p) => p.name === consoleMatch.currentBowler?.name) && (
                              <option value={consoleMatch.currentBowler.name}>
                                {consoleMatch.currentBowler.name}
                              </option>
                            )}
                          {bowlingSquad.map((p, idx) => (
                            <option key={idx} value={p.name}>
                              {p.name} ({p.role}) {p.isCaptain ? "(c)" : ""}
                            </option>
                          ))}
                          <option value="__custom__">➕ Enter Custom Name...</option>
                        </select>
                      </div>
                      <div className="crease-stats-row">
                        <div className="crease-stat-item">
                          <span className="stat-label">Overs</span>
                          <span className="stat-num">{consoleMatch.currentBowler?.overs || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">M</span>
                          <span className="stat-num">{consoleMatch.currentBowler?.maidens || 0}</span>
                        </div>
                        <div className="crease-stat-item">
                          <span className="stat-label">Runs</span>
                          <span className="stat-num">{consoleMatch.currentBowler?.runsConceded || 0}</span>
                        </div>
                        <div className="crease-stat-item highlight-red">
                          <span className="stat-label">Wkts</span>
                          <span className="stat-num text-red">{consoleMatch.currentBowler?.wickets || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. OVER DELIVERIES TRACKER STRIP (Cricket Rule: 6 Legal Balls) */}
                  <div className="lm-over-tracker-strip">
                    <div className="over-tracker-left">
                      <div className="over-tracker-info">
                        <span className="over-tracker-label">
                          This Over:{" "}
                          <strong className={legalBallsInCurrentOver >= 6 ? "text-emerald" : "text-amber"}>
                            {legalBallsInCurrentOver} / 6
                          </strong>{" "}
                          Legal Deliveries
                        </span>
                        <span className="over-tracker-hint">
                          *Wd / Nb add runs without consuming balls
                        </span>
                      </div>

                      <div className="over-balls-list">
                        {currentOverBalls && currentOverBalls.length > 0 ? (
                          currentOverBalls.map((b, idx) => (
                            <span
                              key={idx}
                              className={`ball-badge ${
                                b === "4"
                                  ? "boundary-four"
                                  : b === "6"
                                  ? "boundary-six"
                                  : b === "W"
                                  ? "wicket"
                                  : b.toLowerCase().includes("wd") || b.toLowerCase().includes("nb")
                                  ? "extra"
                                  : b.toLowerCase().includes("b") || b.toLowerCase().includes("lb")
                                  ? "bye-ball"
                                  : "dot"
                              }`}
                            >
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="no-balls-yet">New over ready. Click runs below to score ball.</span>
                        )}
                      </div>
                    </div>

                    <div className="over-tracker-actions">
                      <button
                        type="button"
                        className="btn-over-action undo"
                        onClick={handleUndoBall}
                        title="Undo last recorded ball"
                      >
                        <RotateCcw size={14} />
                        <span>Undo Ball</span>
                      </button>
                      <button
                        type="button"
                        className="btn-over-action next-over-btn"
                        onClick={handleOpenNextOverModal}
                        title="End this over & choose next bowler"
                      >
                        🏁 Next Over
                      </button>
                      <button
                        type="button"
                        className="btn-over-action clear"
                        onClick={handleClearOver}
                        title="Reset current over balls"
                      >
                        Reset Over
                      </button>
                    </div>
                  </div>

                  {/* 3. 1-CLICK SCORING PAD (FULL TACTILE CONTROL PAD - FIXED 56PX BUTTONS) */}
                  <div className="lm-scoring-pad">
                    <div className="scoring-pad-section-title">
                      <div className="scoring-pad-title-left">
                        <Zap size={16} className="text-amber" />
                        <span>⚡ 1-Click Scoring Pad (Click button to record ball instantly)</span>
                      </div>
                      <button
                        type="button"
                        className="btn-undo-pad"
                        onClick={handleUndoBall}
                        title="Undo last recorded delivery"
                      >
                        <RotateCcw size={14} />
                        <span>Undo Last Ball</span>
                      </button>
                    </div>

                    {/* Runs Row */}
                    <div className="scoring-btn-row runs-row">
                      <button
                        type="button"
                        className="score-action-btn dot"
                        onClick={() => handleRecordBall("RUN", 0)}
                      >
                        <span className="btn-main">0</span>
                        <span className="btn-sub">Dot Ball</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn single"
                        onClick={() => handleRecordBall("RUN", 1)}
                      >
                        <span className="btn-main">1</span>
                        <span className="btn-sub">Single</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn run2"
                        onClick={() => handleRecordBall("RUN", 2)}
                      >
                        <span className="btn-main">2</span>
                        <span className="btn-sub">Double</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn run3"
                        onClick={() => handleRecordBall("RUN", 3)}
                      >
                        <span className="btn-main">3</span>
                        <span className="btn-sub">Three</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn four"
                        onClick={() => handleRecordBall("RUN", 4)}
                      >
                        <span className="btn-main">4</span>
                        <span className="btn-sub">FOUR 🔥</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn six"
                        onClick={() => handleRecordBall("RUN", 6)}
                      >
                        <span className="btn-main">6</span>
                        <span className="btn-sub">SIX 💥</span>
                      </button>
                    </div>

                    {/* Extras & Wicket Row */}
                    <div className="scoring-btn-row extras-row">
                      <button
                        type="button"
                        className="score-action-btn wide"
                        onClick={() => handleRecordBall("EXTRA", 1, "WIDE")}
                        title="Wide ball (+1 run, extra ball)"
                      >
                        <span className="btn-main">Wd</span>
                        <span className="btn-sub">Wide (+1)</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn noball"
                        onClick={() => handleRecordBall("EXTRA", 1, "NO_BALL")}
                        title="No ball (+1 run, Free Hit next)"
                      >
                        <span className="btn-main">Nb</span>
                        <span className="btn-sub">No Ball (+1)</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn bye"
                        onClick={() => handleRecordBall("EXTRA", 1, "BYE")}
                        title="Bye (+1 run)"
                      >
                        <span className="btn-main">B</span>
                        <span className="btn-sub">Bye (+1)</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn legbye"
                        onClick={() => handleRecordBall("EXTRA", 1, "LEG_BYE")}
                        title="Leg Bye (+1 run)"
                      >
                        <span className="btn-main">Lb</span>
                        <span className="btn-sub">Leg Bye (+1)</span>
                      </button>

                      <button
                        type="button"
                        className="score-action-btn wicket-btn"
                        onClick={handleOpenWicketDialog}
                        title="Record Wicket / Dismissal with dropdown options"
                      >
                        <span className="btn-main">🔴 OUT / WICKET</span>
                        <span className="btn-sub">Bowled / Caught / LBW / Run Out</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. BOTTOM UTILITY ROW: 50/50 BALANCED GRID (STEPPERS + COMMENTARY) */}
                  <div className="lm-bottom-utility-row">
                    {/* LEFT CARD: MANUAL STEPPERS (MakeTheBoard Controls) */}
                    <div className="lm-cockpit-steppers-card">
                      <div className="steppers-card-header">
                        <div className="steppers-title-group">
                          <span className="steppers-card-title">MANUAL CONTROLS</span>
                          <span className="steppers-card-sub">MakeTheBoard Steppers</span>
                        </div>
                        <button
                          type="button"
                          className="steppers-undo-btn"
                          onClick={handleUndoBall}
                          title="Undo last action"
                        >
                          <RotateCcw size={12} /> Undo
                        </button>
                      </div>

                      <div className="steppers-grid-body">
                        {/* Over Stepper */}
                        <div className="stepper-item">
                          <div className="stepper-meta">
                            <span className="stepper-label">OVER</span>
                            <span className="stepper-val">{currentOversDisplay}</span>
                          </div>
                          <div className="stepper-duo-btns">
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleAdjustOver(1)}
                              title="Add 1 Full Over (+6 balls)"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleAdjustOver(-1)}
                              title="Subtract 1 Full Over (-6 balls)"
                            >
                              -1
                            </button>
                          </div>
                        </div>

                        {/* Balls in Over Stepper */}
                        <div className="stepper-item">
                          <div className="stepper-meta">
                            <span className="stepper-label">BALLS</span>
                            <span className="stepper-val">{legalBallsInCurrentOver} / 6</span>
                          </div>
                          <div className="stepper-duo-btns">
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleAdjustBall(1)}
                              title="Step +1 Ball to current over"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleAdjustBall(-1)}
                              title="Step -1 Ball from current over"
                            >
                              -1
                            </button>
                          </div>
                        </div>

                        {/* Wickets Stepper */}
                        <div className="stepper-item">
                          <div className="stepper-meta">
                            <span className="stepper-label">WICKETS</span>
                            <span className="stepper-val text-red">{currentWicketsDisplay}</span>
                          </div>
                          <div className="stepper-duo-btns">
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleAdjustWicket(1)}
                              title="Step +1 Wicket"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleAdjustWicket(-1)}
                              title="Step -1 Wicket"
                            >
                              -1
                            </button>
                          </div>
                        </div>

                        {/* Innings Switcher */}
                        <div className="stepper-item">
                          <div className="stepper-meta">
                            <span className="stepper-label">INNINGS</span>
                            <span className="stepper-val text-emerald">
                              {consoleMatch.currentInnings === 2 ? "2nd Inn" : "1st Inn"}
                            </span>
                          </div>
                          <div className="stepper-duo-toggle">
                            <button
                              type="button"
                              className={`innings-tab-btn ${consoleMatch.currentInnings === 1 ? "active" : ""}`}
                              onClick={() => handleSwitchInnings(1)}
                              title="Switch to 1st Innings"
                            >
                              1st Inn
                            </button>
                            <button
                              type="button"
                              className={`innings-tab-btn ${consoleMatch.currentInnings === 2 ? "active" : ""}`}
                              onClick={() => handleSwitchInnings(2)}
                              title="Switch to 2nd Innings"
                            >
                              2nd Inn
                            </button>
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className="stepper-actions-row">
                          <button
                            type="button"
                            className="stepper-primary-btn"
                            onClick={handleOpenNextOverModal}
                            title="Start Next Over & Select Bowler"
                          >
                            🏁 Next Over / Change Bowler
                          </button>
                          <button
                            type="button"
                            className="stepper-sub-btn"
                            onClick={handleClearOver}
                            title="Reset current over deliveries"
                          >
                            🔄 Reset Over
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT CARD: LIVE FEED & QUICK COMMENTARY */}
                    <div className="lm-cockpit-commentary-card">
                      <div className="commentary-card-header">
                        <span className="commentary-card-title">LIVE FEED & COMMENTARY</span>
                        <span className="commentary-count">{consoleMatch.commentary?.length || 0} updates</span>
                      </div>

                      <div className="commentary-input-row">
                        <input
                          type="text"
                          placeholder="Post live match update / ball commentary..."
                          value={quickComment}
                          onChange={(e) => setQuickComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handlePostCommentary();
                          }}
                          className="commentary-cockpit-input"
                        />
                        <button type="button" className="commentary-cockpit-btn" onClick={handlePostCommentary}>
                          Post
                        </button>
                      </div>

                      {/* Scrollable Feed Updates */}
                      <div className="commentary-feed-scroll">
                        {consoleMatch.commentary && consoleMatch.commentary.length > 0 ? (
                          consoleMatch.commentary.slice(0, 15).map((c, idx) => (
                            <div key={idx} className="cockpit-feed-item">
                              <span className="feed-over-tag">{c.over ? `Ov ${c.over}` : "Live"}</span>
                              <span className="feed-text-content">{c.text}</span>
                              {c.isBoundary && (
                                <span className={`feed-boundary-pill ${c.boundaryType === "6" ? "six" : "four"}`}>
                                  {c.boundaryType === "6" ? "SIX 💥" : "FOUR 🔥"}
                                </span>
                              )}
                              {c.isWicket && <span className="feed-boundary-pill wicket">OUT</span>}
                            </div>
                          ))
                        ) : (
                          <div className="no-feed-text">No ball commentary posted yet. Type above to add live commentary.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            );
          })()}

            {/* ── TAB 2: PLAYING XI & SQUADS ── */}
            {consoleTab === "SQUADS" && (
              <div className="lm-console-body">
                <div className="lm-squads-team-tabs">
                  <div className="squad-tabs-left">
                    <button
                      className={`squad-tab-btn ${squadTeam === "team1" ? "active" : ""}`}
                      onClick={() => setSquadTeam("team1")}
                    >
                      {consoleMatch.team1?.name} Squad ({consoleMatch.team1?.players?.length || 0})
                    </button>
                    <button
                      className={`squad-tab-btn ${squadTeam === "team2" ? "active" : ""}`}
                      onClick={() => setSquadTeam("team2")}
                    >
                      {consoleMatch.team2?.name} Squad ({consoleMatch.team2?.players?.length || 0})
                    </button>
                  </div>
                  <button
                    type="button"
                    className="lm-btn-seed-squads"
                    onClick={handleAutoSeedSquads}
                    title="Automatically fill standard 11 players for both teams"
                  >
                    <Zap size={14} /> ⚡ Auto-Fill 11 Players for Teams
                  </button>
                </div>

                {/* Add Player Form */}
                <div className="lm-add-player-box">
                  <div className="add-player-title">Add Player to {consoleMatch[squadTeam]?.name}:</div>
                  <div className="add-player-inputs">
                    <input
                      type="text"
                      placeholder="Player Name (e.g. Virat Kohli)..."
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      className="player-name-input"
                    />

                    <select
                      value={newPlayer.role}
                      onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                      className="player-role-select"
                    >
                      <option value="BATSMAN">Batsman</option>
                      <option value="BOWLER">Bowler</option>
                      <option value="ALL_ROUNDER">All-Rounder</option>
                      <option value="WICKET_KEEPER">Wicketkeeper</option>
                    </select>

                    <label className="checkbox-mini">
                      <input
                        type="checkbox"
                        checked={newPlayer.isCaptain}
                        onChange={(e) => setNewPlayer({ ...newPlayer, isCaptain: e.target.checked })}
                      />
                      <span>Captain (c)</span>
                    </label>

                    <label className="checkbox-mini">
                      <input
                        type="checkbox"
                        checked={newPlayer.isWicketKeeper}
                        onChange={(e) => setNewPlayer({ ...newPlayer, isWicketKeeper: e.target.checked })}
                      />
                      <span>WK (wk)</span>
                    </label>

                    <button type="button" className="lm-btn-primary mini" onClick={handleAddPlayer}>
                      <Plus size={15} /> Add Player
                    </button>
                  </div>
                </div>

                {/* Bulk Import Box */}
                <div className="lm-bulk-import-box">
                  <div className="bulk-title">
                    <span>Or Quick Bulk Paste Squad (11 Players):</span>
                  </div>
                  <div className="bulk-row">
                    <textarea
                      rows={2}
                      placeholder="Paste comma or newline separated names e.g. Rohit Sharma (c), Virat Kohli, Rishabh Pant (wk), Jasprit Bumrah..."
                      value={bulkSquadText}
                      onChange={(e) => setBulkSquadText(e.target.value)}
                      className="bulk-textarea"
                    />
                    <button type="button" className="lm-btn-secondary" onClick={handleBulkImport}>
                      Import All
                    </button>
                  </div>
                </div>

                {/* Players List Grid */}
                <div className="lm-players-list-grid">
                  {(consoleMatch[squadTeam]?.players || []).map((p, idx) => (
                    <div key={idx} className="lm-player-item-card">
                      <div className="player-num">#{idx + 1}</div>
                      <div className="player-details">
                        <div className="player-name-row">
                          <span className="player-name">{p.name}</span>
                          {p.isCaptain && <span className="tag-captain">C</span>}
                          {p.isWicketKeeper && <span className="tag-wk">WK</span>}
                        </div>
                        <span className="player-role-badge">{p.role}</span>
                      </div>
                      <button
                        type="button"
                        className="player-del-btn"
                        onClick={() => handleRemovePlayer(squadTeam, idx)}
                        title="Remove Player"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(!consoleMatch[squadTeam]?.players || consoleMatch[squadTeam]?.players.length === 0) && (
                    <div className="no-players-note">
                      No players added to this squad yet. Add players or bulk paste above.
                    </div>
                  )}
                </div>

                {/* Save Squads Button */}
                <div className="lm-squads-footer">
                  <button type="button" className="lm-btn-primary" onClick={handleSaveSquads}>
                    <Check size={16} /> Save Squads to Match
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 3: SCORECARD & MATCH SETTINGS ── */}
            {consoleTab === "SCORECARD" && (
              <div className="lm-console-body">
                <div className="lm-scorecard-settings-grid">
                  <div className="settings-field">
                    <label>Current Inning:</label>
                    <select
                      value={scorecardForm.currentInnings}
                      onChange={(e) =>
                        setScorecardForm({ ...scorecardForm, currentInnings: Number(e.target.value) })
                      }
                    >
                      <option value={1}>1st Innings</option>
                      <option value={2}>2nd Innings</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Currently Batting Team:</label>
                    <select
                      value={scorecardForm.battingTeam}
                      onChange={(e) => {
                        const bTeam = e.target.value;
                        const bwTeam = bTeam === "team1" ? "team2" : "team1";
                        setScorecardForm({ ...scorecardForm, battingTeam: bTeam, bowlingTeam: bwTeam });
                      }}
                    >
                      <option value="team1">{consoleMatch.team1?.name} (Team 1)</option>
                      <option value="team2">{consoleMatch.team2?.name} (Team 2)</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Target Runs (2nd Innings):</label>
                    <input
                      type="number"
                      value={scorecardForm.target}
                      onChange={(e) =>
                        setScorecardForm({ ...scorecardForm, target: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="settings-field">
                    <label>Toss Result Text:</label>
                    <input
                      type="text"
                      placeholder="e.g. India won the toss and elected to bat"
                      value={scorecardForm.toss}
                      onChange={(e) => setScorecardForm({ ...scorecardForm, toss: e.target.value })}
                    />
                  </div>

                  <div className="settings-field">
                    <label>{consoleMatch.team1?.name} Live Score Text:</label>
                    <input
                      type="text"
                      placeholder="e.g. 186/4 (18.2 ov)"
                      value={scorecardForm.team1Score}
                      onChange={(e) => setScorecardForm({ ...scorecardForm, team1Score: e.target.value })}
                    />
                  </div>

                  <div className="settings-field">
                    <label>{consoleMatch.team2?.name} Live Score Text:</label>
                    <input
                      type="text"
                      placeholder="e.g. 142/6 (15.0 ov) or Yet to bat"
                      value={scorecardForm.team2Score}
                      onChange={(e) => setScorecardForm({ ...scorecardForm, team2Score: e.target.value })}
                    />
                  </div>
                </div>

                <div className="lm-scorecard-footer mt-4">
                  <button type="button" className="lm-btn-primary" onClick={handleSaveScorecard}>
                    <Check size={16} /> Save Scorecard & Match Settings
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* ── WICKET RECORD DIALOG ── */}
      {showWicketDialog && (() => {
        const battingSquad =
          (consoleMatch?.battingTeam === "team2"
            ? consoleMatch?.team2?.players
            : consoleMatch?.team1?.players) || [];
        const bowlingSquad =
          (consoleMatch?.battingTeam === "team2"
            ? consoleMatch?.team1?.players
            : consoleMatch?.team2?.players) || [];
        const bowlingTeamObj =
          consoleMatch?.battingTeam === "team2" ? consoleMatch?.team1 : consoleMatch?.team2;

        return (
          <div
            className="lm-modal-overlay lm-submodal-overlay"
            style={{ zIndex: 100000 }}
            onClick={() => setShowWicketDialog(false)}
          >
            <div className="lm-wicket-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="lm-wicket-header">
                <div className="wicket-header-title">
                  <div className="wicket-dot-indicator" />
                  <h3>Record Wicket / Dismissal</h3>
                </div>
                <button className="lm-modal-close" onClick={() => setShowWicketDialog(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmWicket} className="lm-wicket-form">
                {/* 1. Which Batsman is Out? */}
                <div className="lm-form-group">
                  <label>Which Batsman is Out? *</label>
                  <select
                    className="wicket-select"
                    required
                    value={wicketForm.dismissedPlayer}
                    onChange={(e) =>
                      setWicketForm({ ...wicketForm, dismissedPlayer: e.target.value })
                    }
                  >
                    <option value="" disabled>-- Select Dismissed Batsman --</option>
                    {consoleMatch?.striker?.name && (
                      <option value={consoleMatch.striker.name}>
                        🏏 {consoleMatch.striker.name} (Striker / On Strike)
                      </option>
                    )}
                    {consoleMatch?.nonStriker?.name && (
                      <option value={consoleMatch.nonStriker.name}>
                        🏃 {consoleMatch.nonStriker.name} (Non-Striker / Runner)
                      </option>
                    )}
                    {battingSquad
                      .filter(
                        (p) =>
                          p.name !== consoleMatch?.striker?.name &&
                          p.name !== consoleMatch?.nonStriker?.name
                      )
                      .map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} ({p.role})
                        </option>
                      ))}
                    <option value="__custom__">➕ Custom Batsman Name...</option>
                  </select>
                </div>

                {/* 2. Dismissal Method */}
                <div className="lm-form-group">
                  <label>Dismissal Method (Out Type) *</label>
                  <select
                    className="wicket-select"
                    value={wicketForm.wicketType}
                    onChange={(e) => setWicketForm({ ...wicketForm, wicketType: e.target.value })}
                  >
                    <option value="caught">Caught (c Fielder b Bowler)</option>
                    <option value="bowled">Bowled (b Bowler)</option>
                    <option value="lbw">LBW (lbw b Bowler)</option>
                    <option value="runout">Run Out (run out)</option>
                    <option value="stumped">Stumped (st †Keeper b Bowler)</option>
                    <option value="caught_behind">Caught Behind (c †Keeper b Bowler)</option>
                    <option value="caught_bowled">Caught & Bowled (c&b Bowler)</option>
                    <option value="hit_wicket">Hit Wicket (hit wicket b Bowler)</option>
                    <option value="retired_hurt">Retired Hurt / Out</option>
                  </select>
                </div>

                {/* 3. Fielder / Catcher Dropdown (Only when relevant) */}
                {["caught", "runout", "stumped", "caught_behind"].includes(wicketForm.wicketType) && (
                  <div className="lm-form-group">
                    <label>Fielder / Catcher ({bowlingTeamObj?.name || "Fielding Team"}):</label>
                    <select
                      className="wicket-select"
                      value={wicketForm.fielder}
                      onChange={(e) => setWicketForm({ ...wicketForm, fielder: e.target.value })}
                    >
                      <option value="">-- None / Select Fielder --</option>
                      {bowlingSquad.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} {p.isWicketKeeper ? "(†Keeper)" : ""} {p.isCaptain ? "(c)" : ""}
                        </option>
                      ))}
                      <option value="__custom__">➕ Custom Fielder Name...</option>
                    </select>
                    {wicketForm.fielder === "__custom__" && (
                      <input
                        type="text"
                        className="wicket-custom-input mt-2"
                        placeholder="Type custom fielder name..."
                        value={customFielderName}
                        onChange={(e) => setCustomFielderName(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                )}

                {/* 4. Next Incoming Batsman Dropdown */}
                <div className="lm-form-group">
                  <label>Next Incoming Batsman to take Crease:</label>
                  <select
                    className="wicket-select"
                    value={wicketForm.newPlayer}
                    onChange={(e) => setWicketForm({ ...wicketForm, newPlayer: e.target.value })}
                  >
                    <option value="">-- Select Incoming Batsman --</option>
                    {battingSquad.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} ({p.role}) {p.isCaptain ? "(c)" : ""} {p.isWicketKeeper ? "(wk)" : ""}
                      </option>
                    ))}
                    <option value="__custom__">➕ Custom Batsman Name...</option>
                  </select>
                  {wicketForm.newPlayer === "__custom__" && (
                    <input
                      type="text"
                      className="wicket-custom-input mt-2"
                      placeholder="Type custom incoming batsman name..."
                      value={customNewPlayerName}
                      onChange={(e) => setCustomNewPlayerName(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>

                <div className="lm-wicket-footer">
                  <button
                    type="button"
                    className="lm-btn-secondary"
                    onClick={() => setShowWicketDialog(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="lm-btn-primary lm-btn-danger">
                    🔴 Confirm Out & Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── 🏁 NEXT OVER MODAL DIALOG (REPLACES NATIVE BROWSER PROMPT) ── */}
      {showNextOverModal && (() => {
        const bowlingSquad =
          (consoleMatch?.battingTeam === "team2"
            ? consoleMatch?.team1?.players
            : consoleMatch?.team2?.players) || [];
        const bowlingTeamObj =
          consoleMatch?.battingTeam === "team2" ? consoleMatch?.team1 : consoleMatch?.team2;
        const battingTeamObj =
          consoleMatch?.battingTeam === "team2" ? consoleMatch?.team2 : consoleMatch?.team1;
        const currentOverBalls = consoleMatch?.currentOverBalls || [];
        const legalBalls = currentOverBalls.filter(
          (b) => !b.toLowerCase().includes("wd") && !b.toLowerCase().includes("nb")
        ).length;

        return (
          <div
            className="lm-modal-overlay lm-submodal-overlay"
            style={{ zIndex: 100000 }}
            onClick={() => setShowNextOverModal(false)}
          >
            <div className="lm-wicket-dialog lm-next-over-dialog" onClick={(e) => e.stopPropagation()}>
              <div
                className="lm-wicket-header"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                }}
              >
                <div className="wicket-header-title">
                  <div
                    className="wicket-dot-indicator"
                    style={{ background: "#10b981", boxShadow: "0 0 10px #10b981" }}
                  />
                  <h3 style={{ color: "#10b981" }}>🏁 Next Over - Select Bowler</h3>
                </div>
                <button className="lm-modal-close" onClick={() => setShowNextOverModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmNextOver} className="lm-wicket-form">
                {/* Match context info */}
                <div className="next-over-context-box">
                  <div className="context-row">
                    <span>Batting: <strong>{battingTeamObj?.name}</strong></span>
                    <span>Bowling: <strong className="text-amber">{bowlingTeamObj?.name}</strong></span>
                  </div>
                  <div className="context-row">
                    <span>Balls in this Over: <strong>{legalBalls} / 6</strong></span>
                    <span>Current Score: <strong>{consoleMatch?.battingTeam === "team1" ? consoleMatch?.team1?.score : consoleMatch?.team2?.score}</strong></span>
                  </div>
                </div>

                {/* Next Bowler Selector */}
                <div className="lm-form-group">
                  <label>Choose Next Bowler from {bowlingTeamObj?.name || "Fielding Team"} *</label>
                  <select
                    className="wicket-select"
                    required
                    value={nextOverBowler}
                    onChange={(e) => setNextOverBowler(e.target.value)}
                  >
                    <option value="" disabled>-- Select Next Bowler --</option>
                    {bowlingSquad.map((p, idx) => {
                      const isCurrent = p.name === consoleMatch?.currentBowler?.name;
                      return (
                        <option key={idx} value={p.name}>
                          {p.name} ({p.role}) {p.isCaptain ? "(c)" : ""}{" "}
                          {isCurrent ? "⚠️ (Just Bowled)" : ""}
                        </option>
                      );
                    })}
                    <option value="__custom__">➕ Custom Bowler Name...</option>
                  </select>
                </div>

                {/* Custom Bowler input if chosen */}
                {nextOverBowler === "__custom__" && (
                  <div className="lm-form-group">
                    <label>Enter Custom Bowler Name *</label>
                    <input
                      type="text"
                      className="wicket-custom-input"
                      required
                      placeholder="e.g. Jasprit Bumrah..."
                      value={customNextOverBowler}
                      onChange={(e) => setCustomNextOverBowler(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}

                {/* Strike Rotation Checkbox */}
                <label className="checkbox-mini" style={{ padding: "8px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={rotateStrikeOnNewOver}
                    onChange={(e) => setRotateStrikeOnNewOver(e.target.checked)}
                  />
                  <span>Rotate Strike between Batsmen (Ends Change)</span>
                </label>

                <div className="lm-wicket-footer">
                  <button
                    type="button"
                    className="lm-btn-secondary"
                    onClick={() => setShowNextOverModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="lm-btn-primary"
                    style={{ background: "#10b981", borderColor: "#10b981" }}
                  >
                    🏁 Confirm & Start Over
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── CUSTOM CREASE PLAYER MODAL (REPLACES BROWSER PROMPT) ── */}
      {showCustomCreaseModal && (
        <div
          className="lm-modal-overlay lm-submodal-overlay"
          style={{ zIndex: 100000 }}
          onClick={() => setShowCustomCreaseModal(false)}
        >
          <div className="lm-wicket-dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div
              className="lm-wicket-header"
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="wicket-header-title">
                <Users size={18} className="text-blue" />
                <h3 style={{ color: "#60a5fa" }}>
                  Set Custom {customCreaseRole === "striker" ? "Striker Batsman" : customCreaseRole === "nonStriker" ? "Non-Striker Batsman" : "Bowler"}
                </h3>
              </div>
              <button className="lm-modal-close" onClick={() => setShowCustomCreaseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCustomCreasePlayer} className="lm-wicket-form">
              <div className="lm-form-group">
                <label>Player Full Name *</label>
                <input
                  type="text"
                  className="wicket-custom-input"
                  required
                  placeholder="e.g. MS Dhoni, Mitchell Starc..."
                  value={customCreaseName}
                  onChange={(e) => setCustomCreaseName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="lm-wicket-footer">
                <button
                  type="button"
                  className="lm-btn-secondary"
                  onClick={() => setShowCustomCreaseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="lm-btn-primary">
                  Set on Crease
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showScoreModal && (
        <div className="lm-modal-overlay" onClick={() => setShowScoreModal(false)}>
          <div className="lm-score-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lm-modal-header">
              <div className="lm-modal-title">
                <Zap size={20} className="text-amber" />
                <h3>Update Live Score: {scoreMatch?.title}</h3>
              </div>
              <button className="lm-modal-close" onClick={() => setShowScoreModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickScore} className="lm-score-form">
              <div className="lm-form-group">
                <label>{scoreMatch?.team1?.name} Score</label>
                <input
                  type="text"
                  placeholder="e.g. 186/4 (18.2 ov)"
                  value={scoreForm.team1Score}
                  onChange={(e) => setScoreForm({ ...scoreForm, team1Score: e.target.value })}
                />
              </div>

              <div className="lm-form-group">
                <label>{scoreMatch?.team2?.name} Score</label>
                <input
                  type="text"
                  placeholder="e.g. 142/6 (16.2 ov) or Yet to bat"
                  value={scoreForm.team2Score}
                  onChange={(e) => setScoreForm({ ...scoreForm, team2Score: e.target.value })}
                />
              </div>

              <div className="lm-form-group">
                <label>Status Text / Commentary Line</label>
                <input
                  type="text"
                  placeholder="e.g. India won by 24 runs | Need 18 runs from 12 balls"
                  value={scoreForm.currentStatusText}
                  onChange={(e) => setScoreForm({ ...scoreForm, currentStatusText: e.target.value })}
                />
              </div>

              <div className="lm-modal-footer">
                <button type="button" className="lm-btn-secondary" onClick={() => setShowScoreModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="lm-btn-primary">
                  Save Scores
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STREAM PREVIEW MODAL ── */}
      {previewStream && (
        <div className="lm-modal-overlay" onClick={() => setPreviewStream(null)}>
          <div className="lm-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lm-modal-header">
              <div className="lm-modal-title">
                <Play size={20} className="text-red" />
                <h3>Stream Preview: {previewStream.title}</h3>
              </div>
              <button className="lm-modal-close" onClick={() => setPreviewStream(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="lm-preview-body">
              {previewStream.streamType === "youtube" ||
              previewStream.streamUrl.includes("youtube.com") ||
              previewStream.streamUrl.includes("youtu.be") ? (
                <iframe
                  src={
                    previewStream.streamUrl.includes("watch?v=")
                      ? previewStream.streamUrl.replace("watch?v=", "embed/")
                      : previewStream.streamUrl
                  }
                  title="YouTube Preview"
                  className="lm-preview-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewStream.streamType === "embed" ? (
                <iframe src={previewStream.streamUrl} title="Embed Preview" className="lm-preview-iframe" allowFullScreen />
              ) : (
                <video src={previewStream.streamUrl} controls autoPlay muted className="lm-preview-video" />
              )}

              <div className="lm-preview-details">
                <div className="lm-preview-stream-url">
                  <strong>Source URL:</strong> {previewStream.streamUrl}
                </div>
                <div>
                  <strong>Format:</strong> {previewStream.matchFormat} | <strong>Type:</strong>{" "}
                  {previewStream.streamType.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
