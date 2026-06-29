import React from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-brand-light-bg flex flex-col justify-between font-sans">
      
      {/* Structural Application Universal Navigation Header Controller */}
      <Topbar />
      
      {/* Core Dynamic Content Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {children}
      </main>

      {/* Global Corporate Footer Controller */}
      <Footer />

      {/* App Shell Fixed Bottom Bar Container: Appears on mobile/tablets, sets invisible layer space on Desktop monitors */}
      <div className="block md:hidden">
        <BottomNav />
      </div>
      
    </div>
  );
};

export default Layout;