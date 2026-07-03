import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ShortsPage from './pages/ShortsPage';
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
import VideoPlayerPage from './pages/VideoPlayerPage';
import HelpSupportPage from './pages/HelpSupportPage';
import WishlistPage from './pages/WishlistPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import RecommendedPage from './pages/RecommendedPage';
import TvShowEpisodesPage from './pages/TvShowEpisodesPage'; // Apna path check kar lein
import LegalPage from './pages/LegalPage';

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/legal/:type" element={<LegalPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shorts" element={<ShortsPage />} />
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
            {/* Register this dynamic slug parameter rule route within the global structure: */}
            
            {/* <Route path='/tvshows' element={<TVShowsPage />} />
            <Route path="/watch/:slug" element={<VideoPlayerPage />} />
            <Route path="/tv-shows-episodes/:id" element={<VideoPlayerPage />} />
            <Route path="/tv-shows-episodes/:id" element={<TvShowEpisodesPage />} />   */}

            <Route path="/tvshows" element={<TVShowsPage />} />
            <Route path="/watch/:slug" element={<VideoPlayerPage />} /> 
            <Route path="/watch-episode/:id" element={<VideoPlayerPage />} /> 
            
            {/* YAHAN NAYA ROUTE ADD KAREIN */}
            <Route path="/tv-shows-episodes/:id" element={<TvShowEpisodesPage />} />          {/* <Route path="/tv-shows-episodes/:id" element={<VideoPlayerPage />} />  */}
          </Route>
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;