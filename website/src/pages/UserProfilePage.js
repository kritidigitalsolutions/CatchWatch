import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUserPlus, FaUserCheck, FaPlay, FaHeart, FaTimes } from "react-icons/fa";
import Loader from "../components/Loader";
import VerifiedBadge from "../components/VerifiedBadge";
import ProfileVerificationSection from "../components/ProfileVerificationSection";
import {
  getPublicUserProfile,
  toggleFollowUser,
  getUserPosts,
  getUserFollowers,
  getUserFollowing,
} from "../api/userApi";

const UserProfilePage = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Follower/Following Modal State
  const [modalType, setModalType] = useState(null); // 'followers' | 'following' | null
  const [modalList, setModalList] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      setIsLoading(true);
      try {
        const res = await getPublicUserProfile(identifier);
        if (res && res.success) {
          setProfileData(res);
          const userId = res.user?._id || res.user?.id;
          if (userId) {
            try {
              const postsRes = await getUserPosts(userId);
              if (postsRes && postsRes.success) {
                setPosts(postsRes.posts || postsRes.reels || []);
              }
            } catch (pErr) {
              console.error("Fetch user posts error:", pErr);
            }
          }
        }
      } catch (err) {
        console.error("Fetch public profile error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (identifier) {
      fetchProfileAndPosts();
    }
  }, [identifier]);

  // Toggle Follow Handler
  const handleFollowToggle = async () => {
    if (!profileData?.user) return;
    const targetUserId = profileData.user._id || profileData.user.id;
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");

    if (!token) {
      alert("Please log in to follow users.");
      navigate("/login");
      return;
    }

    const prevIsFollowing = profileData.isFollowing;
    const prevFollowersCount = profileData.followersCount;

    // Optimistic Update
    setProfileData((prev) => ({
      ...prev,
      isFollowing: !prevIsFollowing,
      followersCount: prevIsFollowing ? Math.max(0, prevFollowersCount - 1) : prevFollowersCount + 1,
    }));

    setIsFollowLoading(true);
    try {
      const res = await toggleFollowUser(targetUserId);
      if (res && res.success) {
        setProfileData((prev) => ({
          ...prev,
          isFollowing: res.isFollowing,
          followersCount: res.followersCount,
        }));
      }
    } catch (err) {
      console.error("Toggle follow failed:", err);
      setProfileData((prev) => ({
        ...prev,
        isFollowing: prevIsFollowing,
        followersCount: prevFollowersCount,
      }));
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Open Followers/Following Modal
  const openListModal = async (type) => {
    if (!profileData?.user) return;
    const userId = profileData.user._id || profileData.user.id;
    setModalType(type);
    setIsModalLoading(true);
    setModalList([]);

    try {
      if (type === "followers") {
        const res = await getUserFollowers(userId);
        if (res && res.success) setModalList(res.followers || []);
      } else if (type === "following") {
        const res = await getUserFollowing(userId);
        if (res && res.success) setModalList(res.following || []);
      }
    } catch (err) {
      console.error(`Fetch ${type} failed:`, err);
    } finally {
      setIsModalLoading(false);
    }
  };

  if (isLoading) return <Loader />;

  if (!profileData || !profileData.user) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800">User Profile Not Found</h2>
        <p className="text-gray-500 mt-2">The user `@{identifier}` does not exist or has been deleted.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-2 bg-brand-orange text-white rounded-xl font-bold hover:bg-orange-600 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const user = profileData.user;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="max-w-[1600px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Grid: Profile + Reels (Left) & Verification Section (Right) */}
      <div className={`grid grid-cols-1 ${profileData.isSelf ? 'lg:grid-cols-12' : ''} gap-6 items-start`}>
        
        {/* Left Column: Profile Card + Reels */}
        <div className={`${profileData.isSelf ? 'lg:col-span-7 xl:col-span-8' : 'w-full'} flex flex-col gap-6`}>
          {/* Profile Header Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm h-auto">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Avatar */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-orange-100 bg-brand-orange text-white text-5xl font-black flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>

              {/* User Details */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 capitalize flex items-center gap-2 flex-wrap">
                      <span>{user.name}</span>
                      <VerifiedBadge user={user} size="lg" />
                    </h1>
                    <p className="text-sm font-bold text-brand-orange mt-0.5">
                      {user.username ? (user.username.startsWith("@") ? user.username : `@${user.username}`) : "@user"}
                    </p>
                  </div>

                  {/* Follow / Edit Button */}
                  {profileData.isSelf ? (
                    <button
                      onClick={() => navigate("/profile/edit")}
                      className="px-6 py-2.5 bg-gray-100 text-gray-800 font-bold text-sm rounded-xl border border-gray-300 hover:bg-gray-200 transition"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <button
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className={`px-6 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition shadow-sm ${
                        profileData.isFollowing
                          ? "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          : "bg-brand-orange text-white hover:bg-orange-600"
                      }`}
                    >
                      {profileData.isFollowing ? (
                        <>
                          <FaUserCheck /> Following
                        </>
                      ) : (
                        <>
                          <FaUserPlus /> Follow
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-sm text-gray-600 font-medium mt-3 leading-relaxed">
                    {user.bio}
                  </p>
                )}

                {/* Genres */}
                {user.genres && user.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                    {user.genres.map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-orange-50 text-brand-orange text-[11px] font-bold rounded-full border border-orange-100"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100 text-center sm:text-left">
                  <div>
                    <span className="block text-xl font-black text-gray-900">{profileData.postsCount}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Posts</span>
                  </div>
                  <div
                    onClick={() => openListModal("followers")}
                    className="cursor-pointer hover:opacity-80 transition"
                  >
                    <span className="block text-xl font-black text-gray-900">{profileData.followersCount}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Followers</span>
                  </div>
                  <div
                    onClick={() => openListModal("following")}
                    className="cursor-pointer hover:opacity-80 transition"
                  >
                    <span className="block text-xl font-black text-gray-900">{profileData.followingCount}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Following</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Posts / Reels Section (Directly under Left Profile Card) */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <span>Reels & Posts</span>
              <span className="text-sm font-bold text-gray-400">({posts.length})</span>
            </h2>

            {posts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 font-bold text-base">No reels or posts uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {posts.map((reel) => (
                  <div
                    key={reel._id}
                    onClick={() => navigate(`/reels/${reel._id}`)}
                    className="relative bg-neutral-900 rounded-2xl overflow-hidden shadow-sm aspect-[9/16] cursor-pointer group border border-gray-200"
                  >
                    {/* Thumbnail / Video Preview */}
                    <img
                      src={reel.thumbnailUrl || reel.thumbnail || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 533'%3E%3Crect width='300' height='533' fill='%231e293b'/%3E%3Cpath d='M120 236 L190 266 L120 296 Z' fill='%2364748b'/%3E%3C/svg%3E"}
                      alt={reel.caption || "Reel"}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 533'%3E%3Crect width='300' height='533' fill='%231e293b'/%3E%3Cpath d='M120 236 L190 266 L120 296 Z' fill='%2364748b'/%3E%3C/svg%3E";
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition" />

                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center group-hover:scale-110 transition">
                        <FaPlay className="ml-0.5 text-sm" />
                      </div>
                    </div>

                    {/* Views & Caption at Bottom */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-bold line-clamp-1 drop-shadow">
                        {reel.caption || "Reel"}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-300 mt-1 font-semibold">
                        <span className="flex items-center gap-1">
                          <FaPlay className="text-[9px]" /> {reel.viewsCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaHeart className="text-[9px] text-red-500" /> {reel.likesCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Verification Section */}
        {profileData.isSelf && (
          <div className="lg:col-span-5 xl:col-span-4">
            <ProfileVerificationSection userProfile={user} />
          </div>
        )}
      </div>

      {/* Followers / Following List Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 capitalize text-lg">
                {modalType} ({modalList.length})
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-gray-200/60 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {isModalLoading ? (
                <div className="py-8 text-center">
                  <span className="text-sm font-bold text-gray-400">Loading {modalType}...</span>
                </div>
              ) : modalList.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-bold text-sm">
                  No {modalType} found.
                </div>
              ) : (
                modalList.map((item) => {
                  const targetUser = item.follower || item.following || item;
                  if (!targetUser) return null;
                  const uName = targetUser.name || "User";
                  const uHandle = targetUser.username
                    ? targetUser.username.startsWith("@")
                      ? targetUser.username
                      : `@${targetUser.username}`
                    : "@user";
                  const uInit = uName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={targetUser._id || targetUser.id}
                      onClick={() => {
                        setModalType(null);
                        navigate(`/user/${uHandle.replace(/^@/, "")}`);
                      }}
                      className="flex items-center gap-3.5 p-2.5 hover:bg-gray-50 rounded-2xl cursor-pointer transition"
                    >
                      <div className="w-11 h-11 rounded-full bg-brand-orange text-white font-black flex items-center justify-center text-base overflow-hidden flex-shrink-0">
                        {targetUser.profileImage ? (
                          <img src={targetUser.profileImage} alt={uName} className="w-full h-full object-cover" />
                        ) : (
                          uInit
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-gray-900 text-sm truncate flex items-center gap-1.5">
                          <span>{uName}</span>
                          <VerifiedBadge user={targetUser} size="sm" />
                        </h4>
                        <p className="text-xs font-bold text-brand-orange truncate">{uHandle}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
