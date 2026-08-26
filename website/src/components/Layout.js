import React from 'react';
import { useLocation } from 'react-router-dom';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import Footer from './Footer';

const Layout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  const isFullHeightPage =
    path === '/chat' ||
    path === '/upload' ||
    path === '/reels-feed' ||
    path === '/reels' ||
    path.startsWith('/reels');

  const hideFooter = isFullHeightPage;
  const isChatPage = path === '/chat';
  const isReelsPage = path === '/reels-feed' || path === '/reels' || path.startsWith('/reels');

  return (
    <div className="min-h-screen bg-brand-light-bg flex flex-col justify-between font-sans">
      
      {/* Structural Application Universal Navigation Header Controller */}
      <Topbar />
      
      {/* Core Dynamic Content Container Workspace */}
      <main
        className={`flex-1 w-full mx-auto ${
          isChatPage
            ? 'max-w-full p-0 overflow-hidden'
            : isReelsPage
            ? 'max-w-full p-0 sm:py-2 md:py-3 flex flex-col items-center justify-center overflow-hidden'
            : 'max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 md:py-10'
        }`}
      >
        {children}
      </main>

      {/* Global Corporate Footer Controller */}
      {!hideFooter && <Footer />}

      {/* App Shell Fixed Bottom Bar Container: Appears on mobile/tablets, sets invisible layer space on Desktop monitors */}
      <div className="block md:hidden">
        <BottomNav />
      </div>
      
    </div>
  );
};

export default Layout;