import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserAlt, FaBell, FaFileAlt, FaTrashAlt } from "react-icons/fa";
import { MdWorkspacePremium, MdDownload, MdPrivacyTip, MdHelpCenter } from "react-icons/md";
import { FaHeart } from "react-icons/fa6";
import { HiReceiptRefund } from "react-icons/hi";
import { IoLogOut } from "react-icons/io5";
import Loader from '../components/Loader';

// Nayi API import karein
import { getUserProfile, getProfileStats } from '../api/userApi';

const ProfileMenuPage = () => {
  const navigate = useNavigate();

  // Dynamic States
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await getUserProfile();
        const user = response?.user || response?.data || response;

        if (user) {
          setUserData(user);
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
        }
      } catch (error) {
        console.error("Profile Fetch Error:", error);
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

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

  const matrixOptions = [
    { label: 'Edit Profile', route: '/profile/edit', icon: <FaUserAlt /> },
    { label: 'Subscription Plans', route: '/subscription', icon: <MdWorkspacePremium /> },
    { label: 'My Videos', route: '/my-videos', icon: <MdDownload /> },
    { label: 'My Downloads', route: '/downloads', icon: <MdDownload /> },
    { label: 'Notifications Stream', route: '/notifications', icon: <FaBell /> },
    { label: 'Personal Wish List', route: '/wishlist', icon: <FaHeart /> },
    { label: 'Privacy Regulations', route: '/legal/privacy-policy', icon: <MdPrivacyTip /> },
    { label: 'Terms & Conditions', route: '/legal/terms-conditions', icon: <FaFileAlt /> },
    { label: 'Refund Policy guidelines', route: '/legal/refund-policy', icon: <HiReceiptRefund /> },
    { label: 'Help & Support Desk', route: '/support', icon: <MdHelpCenter /> },
    { label: 'Delete Account', route: '/delete-account', icon: <FaTrashAlt />, isDanger: true },
    { label: 'Log Out Session', route: '/login', icon: <IoLogOut />, isLogout: true }
  ];

  if (isLoading) return <Loader />;

  const initial = userData?.name ? userData.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-start py-6 px-4 sm:px-6 lg:px-8">

      {/* Left Column Card Profile Overview Info Banner */}
      <div className="bg-white  border border-gray-200 rounded-2xl overflow-hidden shadow-sm text-center p-6 md:sticky md:top-24 transition-all hover:shadow-md">

        {/* Dynamic User Profile Picture */}
        <div className="w-24 h-24 rounded-full border-4 border-brand-light-bg bg-brand-orange text-white text-4xl font-black flex items-center justify-center mx-auto shadow-md mb-3 overflow-hidden">
          {userData?.profileImage ? (
            <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>

        {/* Dynamic Name and Username */}
        <h2 className="text-xl font-extrabold text-gray-800 capitalize line-clamp-1">
          {userData?.name || "Guest User"}
        </h2>
        {userData?.username && (
          <p className="text-sm font-bold text-brand-orange mt-0.5">
            {userData.username.startsWith("@") ? userData.username : `@${userData.username}`}
          </p>
        )}
        <p className="text-xs text-gray-400 font-medium mt-0.5 line-clamp-1">
          {userData?.email || userData?.phone || ""}
        </p>

        {/* User Bio */}
        {userData?.bio && (
          <p className="text-xs text-gray-600 font-medium italic mt-2 px-2 line-clamp-2">
            "{userData.bio}"
          </p>
        )}

        {/* Stats Row: Posts, Followers, Following */}
        <div className="grid grid-cols-3 gap-2 my-4 py-3 px-2 bg-gray-50 rounded-xl border border-gray-100">
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

        {/* Dynamic Plan Badge */}
        <div className={`p-3 rounded-xl text-[11px] font-bold uppercase tracking-wider ${userData?.isPremium || userData?.planId
          ? "bg-orange-50 text-brand-orange border border-orange-100"
          : "bg-gray-50 text-gray-500 border border-gray-100"
          }`}>
          {userData?.isPremium || userData?.planId ? "Premium Account Member" : "Free Basic Account"}
        </div>
      </div>

      {/* Right Column Core Navigation Grid Panel Block */}
      <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-2">
          Account Management
        </h3>

        <div className="divide-y divide-gray-50">
          {matrixOptions.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                if (item.isLogout) {
                  handleLogout();
                } else if (item.route !== '#') {
                  navigate(item.route);
                }
              }}
              className={`flex items-center justify-between py-4 px-3 hover:bg-gray-50 rounded-xl cursor-pointer transition group ${item.isLogout ? 'mt-4 border-t border-gray-100' : ''}`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-xl w-6 flex items-center justify-center ${item.isLogout || item.isDanger ? 'text-red-500' : 'text-gray-400 group-hover:text-brand-orange transition'}`}>
                  {item.icon}
                </span>
                <span className={`text-sm font-bold ${item.isLogout || item.isDanger ? 'text-red-500' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </div>
              <span className={`font-bold text-xs transform transition group-hover:translate-x-1 ${item.isLogout || item.isDanger ? 'text-red-400' : 'text-gray-300 group-hover:text-brand-orange'}`}>
                ➔
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ProfileMenuPage;