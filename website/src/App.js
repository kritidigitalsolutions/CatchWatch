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

const App = () => {
  useEffect(() => {
    const performRefresh = async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token && token !== "secured_token") {
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
          console.error("Token verification/refresh failed on app load. Logging out.", err);
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    };

    performRefresh();

    // Set up silent refresh timer for every 25 minutes
    const interval = setInterval(async () => {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token && token !== "secured_token") {
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
          console.error("Silent token refresh failed. Session expired.", err);
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
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
          <Route path="/legal/:type" element={<LegalPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shorts" element={<ShortFilmsPage />} />
            <Route path="/reels-feed" element={<ShortsPage />} />
            <Route path="/upload" element={<SelectVideoPage />} />
            <Route path="/search" element={<SearchMoviesPage />} />
            <Route path="/profile" element={<ProfileMenuPage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
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
            {/* YAHAN NAYA ROUTE ADD KAREIN */}
            <Route path="/tv-shows-episodes/:id" element={<TvShowEpisodesPage />} /> 
            <Route path="/my-videos" element={<MyVideosPage />} />
            <Route path="/reels/:id" element={<SingleReelPage />} />
          </Route>
        </Routes>
      </Layout>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </Router>
  );
};

export default App;