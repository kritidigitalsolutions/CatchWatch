import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { refreshTokenCall } from './api/authApi';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ShortsPage from './pages/ShortsPage';
import ShortFilmsPage from './pages/ShortFilmsPage';
import SelectVideoPage from './pages/SelectVideoPage';
import SearchMoviesPage from './pages/SearchMoviesPage';
import ProfileMenuPage from './pages/ProfileMenuPage';
import EditProfilePage from './pages/EditProfilePage';
import DownloadsPage from './pages/DownloadsPage';
import ChoosePlanPage from './pages/ChoosePlanPage';
import ContentExplorerPage from './pages/ContentExplorePage';
import TopChartPage from './pages/TopChartPage';
import MoviePage from './pages/MoviesPage';
import TVShowsPage from './pages/TVShowPage';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VideoPlayerPage from './pages/VideoPlayerPage';
import HelpSupportPage from './pages/HelpSupportPage';
import WishlistPage from './pages/WishlistPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import RecommendedPage from './pages/RecommendedPage';
import TvShowEpisodesPage from './pages/TvShowEpisodesPage'; // Apna path check kar lein
import LegalPage from './pages/LegalPage';
import NotificationsPage from './pages/NotificationsPage';
import MyVideosPage from './pages/MyVideosPage';
import SingleReelPage from './pages/SingleReelPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import UserProfilePage from './pages/UserProfilePage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import CreatorDashboard from './pages/CreatorDashboard';
import VerificationPage from './pages/VerificationPage';
import LeaderboardPage from './pages/LeaderboardPage';

// Helper to check if JWT token is actually expired
const isTokenExpired = (token) => {
  if (!token || token === "secured_token") return false;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return false;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp) {
      return Date.now() >= decoded.exp * 1000 - 10000; // expired if exp is in the past
    }
    return false;
  } catch (e) {
    return false;
  }
};

const App = () => {
  useEffect(() => {
    const performRefresh = async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token && token !== "secured_token") {
        if (isTokenExpired(token)) {
          console.warn("Token expired. Logging out.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }

        try {
          const res = await refreshTokenCall();
          if (res && res.token) {
            localStorage.setItem("authToken", res.token);
            if (res.user) {
              localStorage.setItem("user", JSON.stringify(res.user));
            }
            console.log("Token refreshed successfully on app load.");
          }
        } catch (err) {
          console.warn("Silent token refresh on load encountered an issue; continuing with valid stored session.");
        }
      }
    };

    performRefresh();

    // Set up silent refresh timer for every 25 minutes
    const interval = setInterval(async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token && token !== "secured_token") {
        if (isTokenExpired(token)) {
          console.warn("Token expired during background check. Logging out.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }

        try {
          const res = await refreshTokenCall();
          if (res && res.token) {
            localStorage.setItem("authToken", res.token);
            if (res.user) {
              localStorage.setItem("user", JSON.stringify(res.user));
            }
            console.log("Token refreshed silently in background.");
          }
        } catch (err) {
          console.warn("Silent background token refresh failed; continuing with current session.");
        }
      }
    }, 25 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/:type" element={<LegalPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shorts" element={<ShortFilmsPage />} />
            <Route path="/reels-feed" element={<ShortsPage />} />
            <Route path="/upload" element={<SelectVideoPage />} />
            <Route path="/search" element={<SearchMoviesPage />} />
            <Route path="/profile" element={<ProfileMenuPage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
            <Route path="/profile/delete" element={<DeleteAccountPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/subscription" element={<ChoosePlanPage />} />
            <Route path="/explore" element={<ContentExplorerPage />} />
            <Route path="/recommended" element={<RecommendedPage />} />
            <Route path="/charts" element={<TopChartPage />} />
            <Route path='/movies' element={<MoviePage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/support" element={<HelpSupportPage />} />
            <Route path="/tvshows" element={<TVShowsPage />} />
            <Route path="/watch/:slug" element={<VideoPlayerPage />} /> 
            <Route path="/watch-episode/:id" element={<VideoPlayerPage />} /> 
            <Route path="/notifications" element={<NotificationsPage />} />
            {/* Add new routes here */}
            <Route path="/tv-shows-episodes/:id" element={<TvShowEpisodesPage />} /> 
            <Route path="/my-videos" element={<MyVideosPage />} />
            <Route path="/reels/:id" element={<SingleReelPage />} />
            <Route path="/user/:identifier" element={<UserProfilePage />} />
            <Route path="/@:username" element={<UserProfilePage />} />
            <Route path="/creator/dashboard" element={<CreatorDashboard />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile/verification" element={<VerificationPage />} />
            <Route path="/verification" element={<VerificationPage />} />
          </Route>
        </Routes>
      </Layout>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </Router>
  );
};

export default App;