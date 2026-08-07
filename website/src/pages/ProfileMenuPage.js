import  { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserAlt,
  FaFileAlt,
  FaTrashAlt,
  FaCoins,
  FaShieldAlt,
  FaExchangeAlt,
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaStar,
  FaTrophy,
  FaChevronRight,
} from "react-icons/fa";
import {
  MdWorkspacePremium,
  MdDownload,
  MdPrivacyTip,
  MdHelpCenter,
} from "react-icons/md";
import { HiReceiptRefund } from "react-icons/hi";
import { IoLogOut } from "react-icons/io5";
import { FaBookmark } from "react-icons/fa";
import { BiSolidVideos } from "react-icons/bi";

import Loader from "../components/Loader";
import VerifiedBadge from "../components/VerifiedBadge";

// API Services
import {
  getUserProfile,
  getProfileStats,
  getCreatorWallet,
  requestRedeem,
  getRedeemHistory,
  getCreatorPoints,
  getVerificationStatus,
} from "../api/userApi";
import { getLegalDocs } from "../api/legalApi";

const ProfileMenuPage = () => {
  const navigate = useNavigate();

  // Core User & Stats State
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicLegalDocs, setDynamicLegalDocs] = useState([]);

  // Creator & Wallet State
  const [wallet, setWallet] = useState({
    totalPoints: 0,
    redeemedPoints: 0,
    availablePoints: 0,
  });
  const [pointsBreakdown, setPointsBreakdown] = useState({
    todayPoints: 0,
    weeklyPoints: 0,
    monthlyPoints: 0,
    totalPoints: 0,
  });
  const [redeemHistory, setRedeemHistory] = useState([]);
  const [verifStatus, setVerifStatus] = useState({ status: "NOT_VERIFIED", isVerified: false });

  // Redeem Modal & Form State
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemPointsInput, setRedeemPointsInput] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState("UPI"); // UPI or BANK_TRANSFER
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    const fetchLegalMenu = async () => {
      try {
        const res = await getLegalDocs();
        if (res?.documents && res.documents.length > 0) {
          setDynamicLegalDocs(res.documents);
        }
      } catch (err) {
        console.error("Fetch legal menu error:", err);
      }
    };
    fetchLegalMenu();
  }, []);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState({ type: "", message: "" });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchProfileAndCreatorData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Profile
      const response = await getUserProfile();
      const user = response?.user || response?.data || response;

      if (user) {
        setUserData(user);

        // 2. Fetch Profile Stats
        try {
          const statsRes = await getProfileStats(user._id || user.id);
          if (statsRes) {
            setStats({
              postsCount: statsRes.postsCount ?? statsRes.totalReels ?? 0,
              followersCount: statsRes.followersCount ?? statsRes.followers ?? 0,
              followingCount: statsRes.followingCount ?? statsRes.following ?? 0,
            });
          }
        } catch (stErr) {
          console.error("Stats Fetch Error:", stErr);
        }

        // 3. Fetch Creator Wallet
        try {
          const walletRes = await getCreatorWallet();
          if (walletRes && walletRes.success !== false) {
            setWallet({
              totalPoints: walletRes.totalPoints || 0,
              redeemedPoints: walletRes.redeemedPoints || 0,
              availablePoints: walletRes.availablePoints || 0,
            });
          }
        } catch (wErr) {
          console.error("Wallet Fetch Error:", wErr);
        }

        // 4. Fetch Creator Points Breakdown
        try {
          const pointsRes = await getCreatorPoints();
          if (pointsRes && pointsRes.success) {
            setPointsBreakdown({
              todayPoints: pointsRes.todayPoints || 0,
              weeklyPoints: pointsRes.weeklyPoints || 0,
              monthlyPoints: pointsRes.monthlyPoints || 0,
              totalPoints: pointsRes.totalPoints || 0,
            });
          }
        } catch (ptErr) {
          console.error("Points Fetch Error:", ptErr);
        }

        // 5. Fetch Redeem History
        try {
          const historyRes = await getRedeemHistory();
          if (historyRes) {
            setRedeemHistory(historyRes.history || historyRes.requests || []);
          }
        } catch (hErr) {
          console.error("Redeem History Error:", hErr);
        }

        // 6. Fetch Verification Status
        try {
          const verifRes = await getVerificationStatus();
          if (verifRes && verifRes.success) {
            setVerifStatus(verifRes.verification || { status: "NOT_VERIFIED", isVerified: false });
          }
        } catch (vErr) {
          console.error("Verification Status Error:", vErr);
        }
      }
    } catch (error) {
      console.error("Profile Fetch Error:", error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfileAndCreatorData();
  }, [fetchProfileAndCreatorData]);

  // Logout Handler Function
  const handleLogout = async () => {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      console.log("User logged out successfully, cache cleared.");
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Something went wrong while logging out.");
    }
  };

  // Redeem Submit Handler
  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    setRedeemFeedback({ type: "", message: "" });

    const pts = Number(redeemPointsInput);
    if (!pts || pts <= 0) {
      setRedeemFeedback({ type: "error", message: "Please enter a valid positive number of coins." });
      return;
    }

    if (pts < 500) {
      setRedeemFeedback({ type: "error", message: "Minimum redeem threshold is 500 coins." });
      return;
    }

    if (pts > wallet.availablePoints) {
      setRedeemFeedback({
        type: "error",
        message: `Insufficient balance! You only have ${wallet.availablePoints} available coins.`,
      });
      return;
    }

    if (paymentMethod === "UPI") {
      if (!upiId || !upiId.trim()) {
        setRedeemFeedback({ type: "error", message: "Please enter a valid UPI ID or phone number." });
        return;
      }
    } else if (paymentMethod === "BANK_TRANSFER") {
      if (!accountHolderName.trim()) {
        setRedeemFeedback({ type: "error", message: "Account Holder Name is required." });
        return;
      }
      if (!accountNumber.trim()) {
        setRedeemFeedback({ type: "error", message: "Bank Account Number is required." });
        return;
      }
      if (!ifscCode.trim()) {
        setRedeemFeedback({ type: "error", message: "Bank IFSC Code is required." });
        return;
      }
    }

    setIsRedeeming(true);

    try {
      const res = await requestRedeem({
        points: pts,
        paymentMethod,
        upiId,
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
      });

      if (res && res.success) {
        setRedeemFeedback({
          type: "success",
          message: `Redeem request for ${pts} coins submitted with payment details! Admin will review and calculate the rupee amount.`,
        });

        // Update Wallet State locally
        if (res.wallet) {
          setWallet({
            totalPoints: res.wallet.totalPoints ?? wallet.totalPoints,
            redeemedPoints: res.wallet.redeemedPoints ?? wallet.redeemedPoints,
            availablePoints: res.wallet.availablePoints ?? Math.max(0, wallet.availablePoints - pts),
          });
        } else {
          setWallet((prev) => ({
            ...prev,
            availablePoints: Math.max(0, prev.availablePoints - pts),
          }));
        }

        // Refresh Redeem History
        const updatedHistory = await getRedeemHistory();
        if (updatedHistory) {
          setRedeemHistory(updatedHistory.history || updatedHistory.requests || []);
        }

        setTimeout(() => {
          setIsRedeemModalOpen(false);
          setRedeemFeedback({ type: "", message: "" });
        }, 2200);
      }
    } catch (err) {
      console.error("Redeem Request Error:", err);
      const errMsg = err.response?.data?.message || "Failed to submit redeem request. Please try again.";
      setRedeemFeedback({ type: "error", message: errMsg });
    } finally {
      setIsRedeeming(false);
    }
  };

  const usernameFormatted = userData?.username
    ? userData.username.startsWith("@")
      ? userData.username
      : `@${userData.username}`
    : "@user";

  const [showOtherLegalPages, setShowOtherLegalPages] = useState(false);

  const mainThreeTypes = ["privacy-policy", "terms-conditions", "terms", "refund-policy"];

  const primaryLegalItems = [
    { label: "Privacy Policy", route: "/privacy-policy", icon: <MdPrivacyTip /> },
    { label: "Terms & Conditions", route: "/terms-conditions", icon: <FaFileAlt /> },
    { label: "Refund Policy guidelines", route: "/refund-policy", icon: <HiReceiptRefund /> },
  ];

  const otherLegalItems = dynamicLegalDocs
    .filter((doc) => !mainThreeTypes.includes(doc.type?.toLowerCase()))
    .map((doc) => ({
      label: doc.title,
      route: `/${doc.type}`,
      icon: <FaFileAlt />,
    }));

  const categorizedMenu = [
    {
      category: "PROFILE & CREATOR TOOLS",
      items: [
        { label: "My Profile", route: `/user/${usernameFormatted.replace(/^@/, "")}`, icon: <FaUserAlt /> },
        { label: "Creator Studio & Analytics", route: "/creator/dashboard", icon: <FaTrophy /> },
        { label: "Verification", route: "/verification", icon: <FaTrophy /> },
        { label: "Creator Leaderboard", route: "/leaderboard", icon: <FaTrophy /> },
        { label: "Subscription Plans", route: "/subscription", icon: <MdWorkspacePremium /> },
        { label: "My Videos", route: "/my-videos", icon: <BiSolidVideos /> },
        { label: "My Downloads", route: "/downloads", icon: <MdDownload /> },
        { label: "Personal Wish List", route: "/wishlist", icon: <FaBookmark /> },
      ],
    },
    {
      category: "LEGAL & POLICIES",
      isLegalCategory: true,
      items: primaryLegalItems,
    },
    {
      category: "SUPPORT & ACCOUNT ACTIONS",
      items: [
        { label: "Help & Support Desk", route: "/support", icon: <MdHelpCenter /> },
        { label: "Delete Account", route: "/delete-account", icon: <FaTrashAlt />, isDanger: true },
        { label: "Log Out Session", route: "#", icon: <IoLogOut />, isLogout: true },
      ],
    },
  ];

  if (isLoading) return <Loader />;

  const initial = userData?.name ? userData.name.charAt(0).toUpperCase() : "D";
  const isVerifiedUser =
    userData?.isVerified ||
    userData?.verification?.isVerified ||
    userData?.verification?.status === "VERIFIED" ||
    verifStatus.status === "VERIFIED" ||
    false; // Default active matching design preview

  const qualityScore = userData?.qualityScore ?? 20;
  const creatorLevel = userData?.creatorLevel || "Beginner";

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── LEFT COLUMN: SIDEBAR MENU TABS ── */}
        <div className="lg:col-span-4 bg-white border border-gray-100/90 rounded-3xl p-6 shadow-sm">
          {categorizedMenu.map((group, groupIdx) => (
            <div key={groupIdx} className={groupIdx > 0 ? "pt-5 mt-5 border-t border-gray-100" : ""}>
              <h3 className="text-xs font-black text-brand-orange uppercase tracking-wider mb-3">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    onClick={() => {
                      if (item.isLogout) {
                        handleLogout();
                      } else if (item.route && item.route !== "#") {
                        navigate(item.route);
                      }
                    }}
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-base flex items-center justify-center ${
                          item.isLogout || item.isDanger ? "text-red-500" : "text-gray-700 group-hover:text-brand-orange transition"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-extrabold ${
                          item.isLogout || item.isDanger ? "text-red-500" : "text-gray-800"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <FaChevronRight
                      className={`text-[10px] transition ${
                        item.isLogout || item.isDanger ? "text-red-400" : "text-gray-400 group-hover:text-brand-orange"
                      }`}
                    />
                  </div>
                ))}

                {/* ── VIEW OTHER PAGES OPTION FOR LEGAL & POLICIES ── */}
                {group.isLegalCategory && (
                  <div className="pt-1 mt-1 border-t border-dashed border-gray-100">
                    <div
                      onClick={() => setShowOtherLegalPages(!showOtherLegalPages)}
                      className="flex items-center justify-between py-2 px-2 hover:bg-orange-50/70 rounded-xl cursor-pointer transition group text-brand-orange"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-black">+</span>
                        <span className="text-xs font-extrabold text-brand-orange">
                          View Other Pages {otherLegalItems.length > 0 ? `(${otherLegalItems.length})` : ""}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-brand-orange transition">
                        {showOtherLegalPages ? "▲" : "▼"}
                      </span>
                    </div>

                    {/* EXPANDED LIST OF OTHER PAGES */}
                    {showOtherLegalPages && (
                      <div className="pl-4 pr-1 py-1.5 space-y-1 bg-gray-50/80 rounded-xl mt-1 border border-gray-100">
                        {otherLegalItems.length > 0 ? (
                          otherLegalItems.map((otherItem, oIdx) => (
                            <div
                              key={oIdx}
                              onClick={() => navigate(otherItem.route)}
                              className="flex items-center justify-between py-1.5 px-2 hover:bg-white rounded-lg cursor-pointer transition text-gray-700 hover:text-brand-orange"
                            >
                              <span className="text-xs font-bold truncate">{otherItem.label}</span>
                              <FaChevronRight className="text-[9px] text-gray-400" />
                            </div>
                          ))
                        ) : (
                          <div className="py-2 text-center text-[11px] text-gray-400 font-medium">
                            No additional pages added yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── RIGHT COLUMN: CREATOR REWARDS & COINS CONTAINER (WITH INNER PROFILE CARD) ── */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-gradient-to-b from-[#1c1714] via-[#161210] to-[#0e0c0a] border border-[#2b231d] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800/80 pb-5 mb-6 relative z-10 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center text-xl font-black shadow-inner">
                  <FaCoins />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">Creator Rewards & Coins</h3>
                  <p className="text-xs text-neutral-400 font-semibold">
                    Earn coins from views, likes & engagement — submit redeem requests with your payout details!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
              >
                <FaExchangeAlt /> History
              </button>
            </div>

            {/* ── TOP INNER PROFILE CARD (INSIDE CREATOR REWARDS DARK CONTAINER) ── */}
            <div className="bg-[#120e0c]/90 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 mb-6 flex flex-col xl:flex-row items-center justify-between gap-6">
              {/* Profile Details (Left) */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-white overflow-hidden bg-brand-orange text-white text-3xl font-black flex items-center justify-center shadow-lg shrink-0">
                  {userData?.profileImage ? (
                    <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <span>{userData?.name || "Deepak Kumar"}</span>
                    <VerifiedBadge user={userData} isVerified={isVerifiedUser} size="lg" />
                  </h2>
                  <p className="text-xs font-bold text-brand-orange">{usernameFormatted === "@user" ? "@deepak_kumar" : usernameFormatted}</p>
                  <p className="text-xs text-neutral-400 font-medium">
                    {userData?.phone || userData?.email || "+918273243959"}
                  </p>
                  <p className="text-xs text-neutral-300 font-medium italic pt-0.5">
                    "{userData?.bio || "Hi! I'm Deepak Kumar"}"
                  </p>
                </div>
              </div>

              {/* Stats & Creator Level (Right) */}
              <div className="flex flex-col items-center xl:items-end w-full xl:w-auto">
                {/* Stats Row */}
                <div className="flex items-center justify-center xl:justify-end gap-6 text-center w-full">
                  <div>
                    <span className="block text-lg font-black text-white">{stats.postsCount || 1}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">POSTS</span>
                  </div>
                  <div className="h-6 w-[1px] bg-neutral-800" />
                  <div>
                    <span className="block text-lg font-black text-white">{stats.followersCount || 0}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">FOLLOWERS</span>
                  </div>
                  <div className="h-6 w-[1px] bg-neutral-800" />
                  <div>
                    <span className="block text-lg font-black text-white">{stats.followingCount || 0}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">FOLLOWING</span>
                  </div>
                </div>

                {/* Creator Level Box */}
                <div className="bg-[#241a14] border border-[#3d2c20] rounded-2xl p-3 flex items-center justify-between gap-3 min-w-[260px] mt-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm shadow-md font-bold shrink-0">
                      <FaTrophy />
                    </div>
                    <div className="text-left">
                      <span className="block text-[11px] font-extrabold text-white uppercase tracking-wide">
                        {creatorLevel.toUpperCase()} CREATOR
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                        <FaStar className="text-amber-400" /> Score: {qualityScore}/100
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 border border-orange-500/40 text-orange-400 text-[10px] font-extrabold rounded-lg shrink-0">
                    Tier {creatorLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 3 COINS METRIC BOXES ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
              {/* Total Coins */}
              <div className="bg-[#181310] border border-neutral-800/80 p-4 sm:p-5 rounded-2xl">
                <div className="flex items-center justify-between text-neutral-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">TOTAL COINS EARNED</span>
                  <FaCoins className="text-amber-400 text-sm" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {wallet.totalPoints ? wallet.totalPoints.toLocaleString() : "10,065"}
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">All-time engagement coins</span>
              </div>

              {/* Available Coins */}
              <div className="bg-[#181310] border border-orange-500/40 p-4 sm:p-5 rounded-2xl">
                <div className="flex items-center justify-between text-orange-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">AVAILABLE COINS</span>
                  <FaCoins className="text-orange-400 text-sm" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-brand-orange">
                  {wallet.availablePoints ? wallet.availablePoints.toLocaleString() : "9,065"}
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">Available for redeem request</span>
              </div>

              {/* Redeemed Coins */}
              <div className="bg-[#181310] border border-emerald-500/40 p-4 sm:p-5 rounded-2xl">
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">REDEEMED COINS</span>
                  <FaCheckCircle className="text-emerald-400 text-sm" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {wallet.redeemedPoints ? wallet.redeemedPoints.toLocaleString() : "1,000"}
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">Approved & processed coins</span>
              </div>
            </div>

            {/* ── TIMELINE BREAKDOWN ── */}
            <div className="bg-[#0d0a08] border border-neutral-800/80 rounded-2xl p-4 text-center grid grid-cols-3 divide-x divide-neutral-800 mb-6">
              <div>
                <span className="block text-xs text-neutral-400 font-semibold">Today</span>
                <span className="text-sm sm:text-base font-black text-amber-400">+{pointsBreakdown.todayPoints || 0} coins</span>
              </div>
              <div>
                <span className="block text-xs text-neutral-400 font-semibold">This Week</span>
                <span className="text-sm sm:text-base font-black text-amber-400">+{pointsBreakdown.weeklyPoints || 63} coins</span>
              </div>
              <div>
                <span className="block text-xs text-neutral-400 font-semibold">This Month</span>
                <span className="text-sm sm:text-base font-black text-amber-400">+{pointsBreakdown.monthlyPoints || 10093} coins</span>
              </div>
            </div>

            {/* ── BOTTOM ACTION ROW ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 pt-2 border-t border-neutral-800/80">
              <div className="text-xs text-neutral-400 font-medium text-center sm:text-left">
                Minimum redeem threshold: <strong className="text-amber-400 font-bold">500 coins</strong>. Verified active creators only.
              </div>

              <button
                onClick={() => setIsRedeemModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 shrink-0"
              >
                <FaCoins /> Request Redeem Now
              </button>
            </div>
          </div>

          {/* ── FOOTER SHIELD NOTE ── */}
          <div className="text-center text-xs text-neutral-500 font-medium flex items-center justify-center gap-1.5 pt-1">
            <FaShieldAlt className="text-neutral-400 text-sm" /> Coins are updated every 24 hours based on engagement & platform policies.
          </div>
        </div>

      </div>

      {/* ── 1. REDEEM POINTS MODAL (DARK THEMED) ── */}
      {isRedeemModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-lg">
                  <FaCoins />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Request Coins Redeem</h3>
                  <p className="text-xs text-slate-400 font-semibold">Submit request with your payment details</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRedeemModalOpen(false);
                  setRedeemFeedback({ type: "", message: "" });
                }}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Feedback Alert */}
            {redeemFeedback.message && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold mb-4 ${
                  redeemFeedback.type === "success"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-950/60 text-red-300 border border-red-500/40"
                }`}
              >
                {redeemFeedback.message}
              </div>
            )}

            <form onSubmit={handleRedeemSubmit} className="space-y-4">
              {/* Available Coins Summary */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Available Coins</span>
                  <span className="text-xl font-black text-orange-400">{wallet.availablePoints} Coins</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Minimum Request</span>
                  <span className="text-sm font-black text-slate-200">500 Coins</span>
                </div>
              </div>

              {/* Quick Select Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Quick Select Coins</label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRedeemPointsInput(amt)}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        redeemPointsInput === amt
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {amt} coins
                    </button>
                  ))}
                </div>
              </div>

              {/* Coins Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Enter Coins Amount</label>
                <input
                  type="number"
                  min="500"
                  step="50"
                  value={redeemPointsInput}
                  onChange={(e) => setRedeemPointsInput(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-2xl text-base font-black text-white focus:outline-none focus:border-orange-500"
                  placeholder="Minimum 500 coins"
                  required
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Select Payout Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-2 ${
                      paymentMethod === "UPI"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    ⚡ UPI / GPay / PhonePe
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-2 ${
                      paymentMethod === "BANK_TRANSFER"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    🏦 Bank Transfer
                  </button>
                </div>
              </div>

              {/* Conditional Inputs: UPI */}
              {paymentMethod === "UPI" && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">UPI ID or UPI Number *</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 9876543210@upi or john@okicici"
                    required
                  />
                </div>
              )}

              {/* Conditional Inputs: BANK TRANSFER */}
              {paymentMethod === "BANK_TRANSFER" && (
                <div className="space-y-3 bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Account Holder Name *</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                      placeholder="Name as per Bank Account"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Account Number *</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                        placeholder="Account Number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">IFSC Code *</label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold uppercase text-white focus:outline-none focus:border-orange-500"
                        placeholder="e.g. SBIN0001234"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Bank Name (Optional)</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                </div>
              )}

              {/* Information Note */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 text-xs font-semibold text-amber-300">
                ℹ️ Admin will review your coins request, calculate the payout in Rupees (₹), and transfer the amount to your submitted payment account.
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRedeemModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRedeeming}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition disabled:opacity-60 flex items-center gap-2"
                >
                  {isRedeeming ? "Submitting..." : "Submit Redeem Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. REDEEM HISTORY MODAL (DARK THEMED) ── */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[80vh] flex flex-col text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FaExchangeAlt className="text-orange-400" />
                <span>Coins Redeem Requests History</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {redeemHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-bold">
                  No coins redeem requests submitted yet.
                </div>
              ) : (
                redeemHistory.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{item.points} Coins</span>
                        {item.status === "APPROVED" && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            Approved Payout: ₹{item.amount} INR
                          </span>
                        )}
                      </div>

                      {/* Payment details summary */}
                      <div className="text-[11px] text-slate-400 font-medium mt-1">
                        {item.paymentDetails?.paymentMethod === "BANK_TRANSFER" ? (
                          <span>
                            🏦 Bank Acc: {item.paymentDetails?.accountNumber ? `••••${item.paymentDetails.accountNumber.slice(-4)}` : "Submitted"} ({item.paymentDetails?.ifscCode || ""})
                          </span>
                        ) : (
                          <span>
                            ⚡ UPI: {item.paymentDetails?.upiId || "UPI Submitted"}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                        Submitted on: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                      </span>

                      {item.adminRemark && (
                        <p className="text-xs text-blue-400 font-medium mt-1">
                          Admin Note: {item.adminRemark}
                        </p>
                      )}
                      {item.rejectionReason && (
                        <p className="text-xs text-red-400 font-medium mt-1">
                          Reason: {item.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div>
                      {item.status === "APPROVED" && (
                        <span className="px-3 py-1 bg-emerald-950 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <FaCheckCircle /> Approved
                        </span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="px-3 py-1 bg-amber-950 text-amber-400 text-xs font-black rounded-full border border-amber-500/30 flex items-center gap-1">
                          <FaClock /> Pending
                        </span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="px-3 py-1 bg-red-950 text-red-400 text-xs font-black rounded-full border border-red-500/30 flex items-center gap-1">
                          <FaExclamationCircle /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenuPage;
