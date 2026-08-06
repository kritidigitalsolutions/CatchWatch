import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserAlt,
  FaBell,
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
  FaCrown,
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

const ProfileMenuPage = () => {
  const navigate = useNavigate();

  // Core User & Stats State
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

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

  const matrixOptions = [
    { label: "My Profile", route: `/user/${usernameFormatted.replace(/^@/, "")}`, icon: <FaUserAlt /> },
    { label: "Creator Studio & Analytics", route: "/creator/dashboard", icon: <FaTrophy /> },
    { label: "Creator Leaderboard", route: "/leaderboard", icon: <FaTrophy /> },
    { label: "Edit Profile", route: "/profile/edit", icon: <FaUserAlt /> },
    { label: "Creator Verification Badge", route: "/profile/verification", icon: <FaShieldAlt /> },
    { label: "Subscription Plans", route: "/subscription", icon: <MdWorkspacePremium /> },
    { label: "My Videos", route: "/my-videos", icon: <BiSolidVideos /> },
    { label: "My Downloads", route: "/downloads", icon: <MdDownload /> },
    { label: "Notifications Stream", route: "/notifications", icon: <FaBell /> },
    { label: "Personal Wish List", route: "/wishlist", icon:<FaBookmark /> },
    { label: "Privacy Regulations", route: "/legal/privacy-policy", icon: <MdPrivacyTip /> },
    { label: "Terms & Conditions", route: "/legal/terms-conditions", icon: <FaFileAlt /> },
    { label: "Refund Policy guidelines", route: "/legal/refund-policy", icon: <HiReceiptRefund /> },
    { label: "Dedicated Creator & VIP Support", route: "/vip-support", icon: <FaCrown className="text-amber-500" /> },
    { label: "Help & Support Desk", route: "/support", icon: <MdHelpCenter /> },
    { label: "Delete Account", route: "/delete-account", icon: <FaTrashAlt />, isDanger: true },
    { label: "Log Out Session", route: "/login", icon: <IoLogOut />, isLogout: true },
  ];

  if (isLoading) return <Loader />;

  const initial = userData?.name ? userData.name.charAt(0).toUpperCase() : "U";
  const isVerifiedUser =
    userData?.isVerified ||
    userData?.verification?.isVerified ||
    userData?.verification?.status === "VERIFIED" ||
    verifStatus.status === "VERIFIED";

  const qualityScore = userData?.qualityScore ?? 75;
  const creatorLevel = userData?.creatorLevel || "Bronze";

  return (
    <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-start py-6 px-4 sm:px-6 lg:px-8">
      {/* ── Left Column: User Profile Overview Card ── */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm text-center p-6 md:sticky md:top-24 transition-all hover:shadow-md">
        {/* Profile Picture */}
        <div className="relative w-24 h-24 rounded-full border-4 border-orange-100 bg-brand-orange text-white text-4xl font-black flex items-center justify-center mx-auto shadow-md mb-3 overflow-hidden">
          {userData?.profileImage ? (
            <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>

        {/* Name with Blue Tick */}
        <h2 className="text-xl font-extrabold text-gray-800 capitalize flex items-center justify-center gap-1.5 line-clamp-1">
          <span>{userData?.name || "Guest User"}</span>
          <VerifiedBadge user={userData} isVerified={isVerifiedUser} size="lg" />
        </h2>

        {/* Username */}
        <p className="text-sm font-bold text-brand-orange mt-0.5">{usernameFormatted}</p>
        <p className="text-xs text-gray-400 font-medium mt-0.5 line-clamp-1">
          {userData?.email || userData?.phone || ""}
        </p>

        {/* User Bio */}
        {userData?.bio && (
          <p className="text-xs text-gray-600 font-medium italic mt-2 px-2 line-clamp-2">
            "{userData.bio}"
          </p>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 my-4 py-3 px-2 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="text-center">
            <span className="block text-base font-black text-gray-800">{stats.postsCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Posts</span>
          </div>
          <div className="text-center border-x border-gray-200">
            <span className="block text-base font-black text-gray-800">{stats.followersCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Followers</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-black text-gray-800">{stats.followingCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Following</span>
          </div>
        </div>

        {/* Badges Stack */}
        <div className="space-y-2">
          {/* Creator Level & Quality Score Badge */}
          <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200/70 flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm shadow-sm font-bold">
                <FaTrophy />
              </div>
              <div>
                <span className="block text-[11px] font-extrabold text-gray-900 uppercase tracking-wide">
                  {creatorLevel} Creator
                </span>
                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                  <FaStar className="text-amber-400" /> Score: {qualityScore}/100
                </span>
              </div>
            </div>
            <span className="px-2 py-1 bg-white text-orange-600 rounded-lg text-[10px] font-black shadow-xs border border-orange-100">
              Tier {creatorLevel}
            </span>
          </div>

          {/* Verification Status Pill */}
          <div
            onClick={() => navigate(`/user/${usernameFormatted.replace(/^@/, "")}`)}
            className={`p-3 rounded-2xl text-[11px] font-extrabold flex items-center justify-between cursor-pointer transition ${
              isVerifiedUser
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                : verifStatus.status === "PENDING"
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <FaShieldAlt className={isVerifiedUser ? "text-blue-500 text-base" : "text-gray-400 text-base"} />
              <span>
                {isVerifiedUser
                  ? "Blue Tick Verified Creator"
                  : verifStatus.status === "PENDING"
                  ? "Verification Under Review"
                  : "Apply for Blue Tick"}
              </span>
            </div>
            <span className="text-xs font-black">➔</span>
          </div>

          {/* Membership Badge */}
          <div
            className={`p-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider ${
              userData?.isPremium || userData?.planId
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-gray-50 text-gray-500 border border-gray-100"
            }`}
          >
            {userData?.isPremium || userData?.planId ? "⭐ Premium Subscriber" : "Free Basic Account"}
          </div>
        </div>
      </div>

      {/* ── Right Column: Creator Wallet & Main Navigation Grid ── */}
      <div className="md:col-span-2 space-y-6">

        {/* ── CREATOR REWARDS & COINS CARD ── */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-black text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-neutral-800">
          {/* Ambient Glow Background */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center text-lg font-black shadow-inner">
                <FaCoins />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">Creator Rewards & Coins</h3>
                <p className="text-xs text-neutral-400 font-semibold">
                  Earn coins from views, likes & engagement — submit redeem requests with your payout details!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1.5"
            >
              <FaExchangeAlt /> History
            </button>
          </div>

          {/* Coins Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
            {/* Total Points */}
            <div className="bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/60 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Coins Earned</span>
                <FaCoins className="text-amber-400 text-sm" />
              </div>
              <div className="text-2xl font-black text-white">{wallet.totalPoints.toLocaleString()}</div>
              <span className="text-[10px] text-neutral-400 font-medium">All-time engagement coins</span>
            </div>

            {/* Redeemable Points */}
            <div className="bg-neutral-800/80 backdrop-blur-sm border border-orange-500/30 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-orange-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Available Coins</span>
                <FaCoins className="text-orange-400 text-sm" />
              </div>
              <div className="text-2xl font-black text-orange-400">{wallet.availablePoints.toLocaleString()}</div>
              <span className="text-[10px] text-neutral-400 font-medium">Available for redeem request</span>
            </div>

            {/* Redeemed Points */}
            <div className="bg-neutral-800/80 backdrop-blur-sm border border-emerald-500/30 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Redeemed Coins</span>
                <FaCheckCircle className="text-emerald-400 text-sm" />
              </div>
              <div className="text-2xl font-black text-emerald-400">{wallet.redeemedPoints.toLocaleString()}</div>
              <span className="text-[10px] text-neutral-400 font-medium">Approved & processed coins</span>
            </div>
          </div>

          {/* Points Timeline Breakdown */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-950/60 p-3 rounded-2xl border border-neutral-800 mb-6 text-center">
            <div>
              <span className="block text-xs text-neutral-400 font-semibold">Today</span>
              <span className="text-sm font-black text-amber-400">+{pointsBreakdown.todayPoints} coins</span>
            </div>
            <div className="border-x border-neutral-800">
              <span className="block text-xs text-neutral-400 font-semibold">This Week</span>
              <span className="text-sm font-black text-amber-400">+{pointsBreakdown.weeklyPoints} coins</span>
            </div>
            <div>
              <span className="block text-xs text-neutral-400 font-semibold">This Month</span>
              <span className="text-sm font-black text-amber-400">+{pointsBreakdown.monthlyPoints} coins</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 pt-2 border-t border-neutral-800">
            <div className="text-xs text-neutral-400 font-medium text-center sm:text-left">
              Minimum redeem threshold: <strong className="text-amber-400">500 coins</strong>. Verified active creators only.
            </div>

            <button
              onClick={() => setIsRedeemModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-lg transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <FaCoins /> Request Redeem Now
            </button>
          </div>
        </div>

        {/* ── CORE NAVIGATION GRID ── */}
        <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-2">
            Account Management & Settings
          </h3>

          <div className="divide-y divide-gray-50">
            {matrixOptions.map((item, index) => (
              <div
                key={index}
                onClick={() => {
                  if (item.isLogout) {
                    handleLogout();
                  } else if (item.route !== "#") {
                    navigate(item.route);
                  }
                }}
                className={`flex items-center justify-between py-4 px-3 hover:bg-gray-50 rounded-2xl cursor-pointer transition group ${
                  item.isLogout ? "mt-4 border-t border-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xl w-6 flex items-center justify-center ${
                      item.isLogout || item.isDanger
                        ? "text-red-500"
                        : "text-gray-400 group-hover:text-brand-orange transition"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      item.isLogout || item.isDanger ? "text-red-500" : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className={`font-bold text-xs transform transition group-hover:translate-x-1 ${
                    item.isLogout || item.isDanger ? "text-red-400" : "text-gray-300 group-hover:text-brand-orange"
                  }`}
                >
                  ➔
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 1. REDEEM POINTS MODAL ── */}
      {isRedeemModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-lg">
                  <FaCoins />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Request Coins Redeem</h3>
                  <p className="text-xs text-gray-500 font-semibold">Submit request with your payment details</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRedeemModalOpen(false);
                  setRedeemFeedback({ type: "", message: "" });
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Feedback Alert */}
            {redeemFeedback.message && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold mb-4 ${
                  redeemFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {redeemFeedback.message}
              </div>
            )}

            <form onSubmit={handleRedeemSubmit} className="space-y-4">
              {/* Available Coins Summary */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 block uppercase">Available Coins</span>
                  <span className="text-xl font-black text-brand-orange">{wallet.availablePoints} Coins</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-gray-500 block uppercase">Minimum Request</span>
                  <span className="text-sm font-black text-gray-700">500 Coins</span>
                </div>
              </div>

              {/* Quick Select Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Quick Select Coins</label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRedeemPointsInput(amt)}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        redeemPointsInput === amt
                          ? "bg-brand-orange text-white border-brand-orange"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {amt} coins
                    </button>
                  ))}
                </div>
              </div>

              {/* Coins Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Enter Coins Amount</label>
                <input
                  type="number"
                  min="500"
                  step="50"
                  value={redeemPointsInput}
                  onChange={(e) => setRedeemPointsInput(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-base font-black text-gray-900 focus:outline-none focus:border-brand-orange"
                  placeholder="Minimum 500 coins"
                  required
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Select Payout Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-2 ${
                      paymentMethod === "UPI"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
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
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    🏦 Bank Transfer
                  </button>
                </div>
              </div>

              {/* Conditional Inputs: UPI */}
              {paymentMethod === "UPI" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">UPI ID or UPI Number *</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:border-brand-orange"
                    placeholder="e.g. 9876543210@upi or john@okicici"
                    required
                  />
                </div>
              )}

              {/* Conditional Inputs: BANK TRANSFER */}
              {paymentMethod === "BANK_TRANSFER" && (
                <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/80">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Account Holder Name *</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-orange"
                      placeholder="Name as per Bank Account"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Account Number *</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-orange"
                        placeholder="Account Number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">IFSC Code *</label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-900 focus:outline-none focus:border-brand-orange"
                        placeholder="e.g. SBIN0001234"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Bank Name (Optional)</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-brand-orange"
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                </div>
              )}

              {/* Information Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-semibold text-amber-800">
                ℹ️ Admin will review your coins request, calculate the payout in Rupees (₹), and transfer the amount to your submitted payment account.
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRedeemModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRedeeming}
                  className="px-6 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition disabled:opacity-60 flex items-center gap-2"
                >
                  {isRedeeming ? "Submitting..." : "Submit Redeem Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. REDEEM HISTORY MODAL ── */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <FaExchangeAlt className="text-brand-orange" />
                <span>Coins Redeem Requests History</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {redeemHistory.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-bold">
                  No coins redeem requests submitted yet.
                </div>
              ) : (
                redeemHistory.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">{item.points} Coins</span>
                        {item.status === "APPROVED" && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Approved Payout: ₹{item.amount} INR
                          </span>
                        )}
                      </div>

                      {/* Payment details summary */}
                      <div className="text-[11px] text-gray-500 font-medium mt-1">
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

                      <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                        Submitted on: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                      </span>

                      {item.adminRemark && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Admin Note: {item.adminRemark}
                        </p>
                      )}
                      {item.rejectionReason && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          Reason: {item.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div>
                      {item.status === "APPROVED" && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full flex items-center gap-1">
                          <FaCheckCircle /> Approved
                        </span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full flex items-center gap-1">
                          <FaClock /> Pending
                        </span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full flex items-center gap-1">
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
