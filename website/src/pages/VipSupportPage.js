import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCrown,
  FaShieldAlt,
  FaWrench,
  FaBroadcastTower,
  FaCopyright,
  FaUserShield,
  FaLock,
  FaPaperclip,
  FaPaperPlane,
  FaTimes,
  FaCommentDots,
  FaHistory,
} from "react-icons/fa";

import {
  checkVipAccess,
  createVipSupportTicket,
  getVipSupportTickets,
  getVipTicketById,
  replyToVipTicket,
} from "../api/supportApi";
import VerifiedBadge from "../components/VerifiedBadge";
import Loader from "../components/Loader";
import "./VipSupportPage.css";

const CATEGORIES = [
  {
    id: "TECHNICAL_GLITCH",
    label: "Technical Glitch & Bugs",
    icon: <FaWrench className="text-amber-400" />,
    desc: "Player crash, video upload failures, encoding or streaming errors",
  },
  {
    id: "BROADCAST",
    label: "Broadcast & Live Questions",
    icon: <FaBroadcastTower className="text-blue-400" />,
    desc: "Live broadcast quality, stream key settings & feed connectivity",
  },
  {
    id: "COPYRIGHT",
    label: "Copyright & IP Inquiries",
    icon: <FaCopyright className="text-purple-400" />,
    desc: "Copyright strikes, original audio/video ownership & DMCA counter-notices",
  },
  {
    id: "ACCOUNT_RECOVERY",
    label: "Account & Security Recovery",
    icon: <FaUserShield className="text-emerald-400" />,
    desc: "Urgent account restoration, credential reset & compromised access desk",
  },
];

const VipSupportPage = () => {
  const navigate = useNavigate();

  // Verification & Access State
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [userData , setUserData] = useState(null);

  // VIP Form State
  const [category, setCategory] = useState("TECHNICAL_GLITCH");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // VIP Tickets History & Live Chat State
  const [vipTickets, setVipTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatReply, setChatReply] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. Check VIP Access on Mount
  const fetchAccessAndTickets = useCallback(async () => {
    setIsVerifying(true);
    try {
      const res = await checkVipAccess();
      if (res && res.success) {
        setIsVerified(res.isVerified);
        setUserData(res.user);
        if (res.isVerified) {
          fetchTicketsList();
        }
      }
    } catch (err) {
      console.error("VIP Access Check Error:", err);
      // Check if user object in localStorage has verification
      const storedUserRaw = localStorage.getItem("user");
      if (storedUserRaw) {
        try {
          const parsed = JSON.parse(storedUserRaw);
          const verified =
            parsed.isVerified ||
            parsed.verification?.isVerified ||
            parsed.verification?.status === "VERIFIED";
          setIsVerified(verified);
          setUserData(parsed);
          if (verified) fetchTicketsList();
        } catch (e) {
          setIsVerified(false);
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const fetchTicketsList = async () => {
    setTicketsLoading(true);
    try {
      const res = await getVipSupportTickets();
      if (res && res.tickets) {
        setVipTickets(res.tickets);
      }
    } catch (err) {
      console.error("Fetch VIP Tickets Error:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessAndTickets();
  }, [fetchAccessAndTickets]);

  // Handle Form Submission
  const handleSubmitVipQuery = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!isVerified) {
      setFeedback({
        type: "error",
        text: "Access denied. VIP Support is exclusively available for Blue Tick verified users.",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setFeedback({ type: "error", text: "Please enter both a subject and detailed message." });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("message", message.trim());
      formData.append("category", category);
      formData.append("priority", "URGENT");

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await createVipSupportTicket(formData);

      setFeedback({
        type: "success",
        text: "🎉 Priority VIP Support Inquiry submitted! Dedicated support agent has been notified.",
      });

      setSubject("");
      setMessage("");
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list
      fetchTicketsList();
    } catch (err) {
      console.error("Submit VIP Query Error:", err);
      const errMsg =
        err.response?.data?.message ||
        "Failed to submit VIP ticket. Please verify your connection.";
      setFeedback({ type: "error", text: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Chat Drawer for a ticket
  const handleOpenTicketChat = async (ticket) => {
    setSelectedTicket(ticket);
    setIsChatOpen(true);
    try {
      const res = await getVipTicketById(ticket._id);
      if (res && res.ticket) {
        setSelectedTicket(res.ticket);
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error("Fetch Single Ticket Error:", err);
    }
  };

  // Reply in Chat
  const handleSendChatReply = async (e) => {
    e.preventDefault();
    if (!chatReply.trim() || !selectedTicket) return;

    setIsSendingReply(true);
    try {
      const formData = new FormData();
      formData.append("message", chatReply.trim());

      const res = await replyToVipTicket(selectedTicket._id, formData);
      setChatReply("");
      if (res && res.messages) {
        setMessages(res.messages);
      }
      fetchTicketsList();
    } catch (err) {
      console.error("Reply VIP Ticket Error:", err);
      alert(err.response?.data?.message || "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isVerifying) return <Loader />;

  return (
    <div className="vip-support-page max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── HERO BANNER ── */}
      <div className="vip-hero-card relative overflow-hidden rounded-3xl p-6 sm:p-10 text-white shadow-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-black border border-amber-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-700"
          >
            <FaArrowLeft /> Back
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl shadow-lg border border-amber-300/40">
              <FaCrown />
            </div>
            <div>
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest block">
                Catch & Watch Exclusive Desk
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Dedicated Creator & VIP Support
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base font-medium text-neutral-300 max-w-3xl leading-relaxed">
            <strong className="text-amber-400 font-bold">Direct Human Assistance:</strong> Bypass automated bot queues with direct access to a dedicated Catch & Watch support desk. Resolve technical glitches, broadcast questions, copyright inquiries, or account recovery requests with priority response times.
          </p>

          {/* User Status Ribbon */}
          <div className="pt-2 flex items-center gap-3">
            {isVerified ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-400/40 text-blue-300 rounded-2xl text-xs font-black shadow-inner">
                <VerifiedBadge isVerified={true} size="md" />
                <span>Verified Creator Access Unlocked ({userData?.name || userData?.username || "VIP Member"})</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-2xl text-xs font-extrabold shadow-inner">
                <FaLock className="text-amber-400" />
                <span>VIP Restricted — Blue Tick Verification Required</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 SERVICE PILLARS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-2 ${
              category === cat.id
                ? "bg-neutral-900 text-white border-amber-500 shadow-lg scale-[1.02]"
                : "bg-white text-gray-800 border-gray-100 hover:border-amber-200 hover:shadow-md"
            }`}
          >
            <div className="text-2xl">{cat.icon}</div>
            <h3 className="font-extrabold text-sm tracking-tight">{cat.label}</h3>
            <p className="text-xs text-gray-400 font-medium leading-normal">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* ── NON-VERIFIED ACCESS RESTRICTION BANNER ── */}
      {!isVerified && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
              <FaLock />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-lg font-black text-amber-950 flex items-center gap-2">
                <span>Blue Tick Verification Required for Live Query Desk</span>
                <FaShieldAlt className="text-amber-600" />
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-amber-800 leading-relaxed">
                Website visitors can explore VIP Support services above. However, direct human ticket submission and priority queue access are exclusively reserved for verified creators holding the Catch & Watch Blue Tick badge.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-amber-200/80">
            <span className="text-xs font-bold text-amber-900">
              ⚡ Get verified today to unlock 24/7 dedicated support & priority response times.
            </span>
            <button
              onClick={() => navigate("/verification")}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-2xl shadow-lg transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <FaShieldAlt /> Apply for Blue Tick Verification
            </button>
          </div>
        </div>
      )}

      {/* ── INQUIRY FORM & TICKETS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT 2 COLS: TICKET FORM (LOCKED IF NOT VERIFIED) */}
        <div className="lg:col-span-2 relative">
          {!isVerified && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-20 rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-3 border border-amber-200">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
                <FaLock />
              </div>
              <h3 className="text-lg font-black text-gray-900">VIP Ticket Desk Locked</h3>
              <p className="text-xs font-bold text-gray-600 max-w-md">
                Please verify your profile to unlock priority ticket creation and direct human support.
              </p>
              <button
                onClick={() => navigate("/verification")}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-md transition"
              >
                Verify Profile Now
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <FaCrown className="text-amber-500" />
                  <span>Submit VIP Support Inquiry</span>
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Direct human assistance with URGENT priority flag
                </p>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black tracking-wider uppercase">
                ⚡ Urgent Queue
              </span>
            </div>

            {feedback.text && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleSubmitVipQuery} className="space-y-5">
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Select Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!isVerified}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Inquiry Title / Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!isVerified}
                  placeholder="e.g. Broadcast playback failing on Chrome v128"
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Detailed Issue Explanation *
                </label>
                <textarea
                  rows="5"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={!isVerified}
                  placeholder="Provide complete details including steps to reproduce, timestamps, video titles, or account IDs..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none"
                  required
                />
              </div>

              {/* Attachments Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Attachments (Screenshots / Logs, Max 5)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  disabled={!isVerified}
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachments(Array.from(e.target.files).slice(0, 5));
                    }
                  }}
                  className="hidden"
                  id="vipFileUpload"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!isVerified}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition flex items-center gap-2"
                  >
                    <FaPaperclip /> Add Files
                  </button>
                  <span className="text-xs font-medium text-gray-400">
                    {attachments.length > 0
                      ? `${attachments.length} file(s) selected`
                      : "Optional screenshots or screen recordings"}
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((file, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        {file.name}
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="text-amber-600 hover:text-amber-900"
                        >
                          <FaTimes size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isVerified}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 rounded-2xl shadow-lg transition transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  "Sending to Priority Support Desk..."
                ) : (
                  <>
                    <FaPaperPlane /> Submit Priority VIP Ticket
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COL: MY VIP TICKETS HISTORY */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <FaHistory className="text-amber-500" />
              <span>My VIP Tickets</span>
            </h3>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
              {vipTickets.length}
            </span>
          </div>

          {!isVerified ? (
            <div className="text-center py-8 text-xs font-semibold text-gray-400 space-y-2">
              <FaLock className="mx-auto text-xl text-gray-300" />
              <p>Tickets list locked for non-verified profiles.</p>
            </div>
          ) : ticketsLoading ? (
            <div className="text-center py-8 text-xs font-bold text-gray-400">
              Loading VIP tickets...
            </div>
          ) : vipTickets.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-gray-400 space-y-1">
              <FaCommentDots className="mx-auto text-2xl text-gray-300" />
              <p>No VIP tickets submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {vipTickets.map((t) => (
                <div
                  key={t._id}
                  onClick={() => handleOpenTicketChat(t)}
                  className="p-4 rounded-2xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50/40 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        t.status === "OPEN"
                          ? "bg-blue-100 text-blue-700"
                          : t.status === "PENDING"
                          ? "bg-amber-100 text-amber-700"
                          : t.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-gray-800 line-clamp-1">{t.subject}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2">{t.lastMessage}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LIVE CHAT / CONVERSATION MODAL ── */}
      {isChatOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  <FaCrown />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white line-clamp-1">
                    {selectedTicket.subject}
                  </h3>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    VIP Ticket #{selectedTicket._id?.substring(0, 8)} · Priority Desk
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/50">
              {messages.map((m) => {
                const isAdmin = m.senderType === "ADMIN";
                return (
                  <div
                    key={m._id}
                    className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                        isAdmin
                          ? "bg-white text-gray-900 border border-gray-200 rounded-tl-none"
                          : "bg-amber-500 text-white rounded-tr-none"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-bold opacity-80 border-b border-white/20 pb-1">
                        <span>{isAdmin ? "CatchWatch Support Desk" : "You"}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p>{m.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendChatReply} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                value={chatReply}
                onChange={(e) => setChatReply(e.target.value)}
                placeholder="Type your response to the support desk..."
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-amber-500"
                disabled={isSendingReply || selectedTicket.status === "CLOSED"}
              />
              <button
                type="submit"
                disabled={isSendingReply || !chatReply.trim() || selectedTicket.status === "CLOSED"}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <FaPaperPlane /> Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipSupportPage;
