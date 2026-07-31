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
      // Rollback
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
    try {
      let res;
      if (type === "followers") {
        res = await getUserFollowers(userId);
        setModalList(res.followers || []);
      } else {
        res = await getUserFollowing(userId);
        setModalList(res.following || []);
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
        <p className="text-gray-500 mt-2">The user `@${identifier}` does not exist or has been deleted.</p>
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
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Profile Header Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
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
              {/* <div className="hidden sm:block">
                <span className="block text-xl font-black text-gray-900">{profileData.totalLikes || 0}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Likes</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Verification Section (Only for Self Profile) */}
      {profileData.isSelf && <ProfileVerificationSection userProfile={user} />}

      {/* User Posts / Reels Section */}
      <div className="mt-8">
        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <span>Reels & Posts</span>
          <span className="text-sm font-bold text-gray-400">({posts.length})</span>
        </h2>

        {posts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-400 font-bold text-base">No reels or posts uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {posts.map((reel) => (
              <div
                key={reel._id}
                onClick={() => navigate(`/reels/${reel._id}`)}
                className="relative bg-neutral-900 rounded-2xl overflow-hidden shadow-sm aspect-[9/16] cursor-pointer group border border-gray-200"
              >
                {/* Thumbnail / Video Preview */}
                {reel.thumbnailUrl || reel.thumbnail ? (
                  <img
                    src={reel.thumbnailUrl || reel.thumbnail}
                    alt={reel.caption || "Reel"}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center text-white">
                    <FaPlay className="text-3xl text-brand-orange opacity-80 group-hover:scale-125 transition duration-300" />
                  </div>
                )}

                {/* Dark Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition" />

                {/* Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white pl-0.5 group-hover:scale-110 transition">
                    <FaPlay className="text-sm" />
                  </div>
                </div>

                {/* Bottom Caption & Views */}
                <div className="absolute bottom-3 left-3 right-3 text-white z-10">
                  <p className="text-xs font-bold line-clamp-2 leading-snug drop-shadow-sm">
                    {reel.caption || "Reel video"}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300 mt-1">
                    <span>{reel.viewsCount || 0} views</span>
                    {reel.likesCount !== undefined && (
                      <span className="flex items-center gap-1 text-red-400">
                        <FaHeart className="text-[9px]" /> {reel.likesCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Followers / Following Modal */}
      {modalType && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-3">
              <h3 className="text-lg font-black text-gray-900 capitalize">
                {modalType === "followers" ? "Followers" : "Following"}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                <FaTimes />
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isModalLoading ? (
                <div className="py-8 text-center text-gray-400 font-bold">Loading users...</div>
              ) : modalList.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-bold">
                  No {modalType} yet.
                </div>
              ) : (
                modalList.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => {
                      setModalType(null);
                      navigate(`/user/${u.username ? u.username.replace(/^@/, "") : u._id}`);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-orange text-white text-lg font-bold flex items-center justify-center overflow-hidden">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name ? u.name.charAt(0).toUpperCase() : "U"
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          <VerifiedBadge user={u} size="sm" />
                        </h4>
                        <p className="text-xs font-medium text-gray-400">
                          {u.username ? (u.username.startsWith("@") ? u.username : `@${u.username}`) : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-orange hover:underline">View ➔</span>
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

export default UserProfilePage;
