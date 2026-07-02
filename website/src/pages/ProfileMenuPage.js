import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserAlt } from "react-icons/fa";
import { MdWorkspacePremium } from "react-icons/md";
import { MdDownload } from "react-icons/md";
import { FaBell } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";
import { MdPrivacyTip } from "react-icons/md";
import { FaFileAlt } from "react-icons/fa";
import { HiReceiptRefund } from "react-icons/hi";
import { MdHelpCenter } from "react-icons/md";
import { IoLogOut } from "react-icons/io5";
import Loader from '../components/Loader';

// Agar aapke paas logout ki api hai toh usko yahan import kar lein
// import { logout } from '../api/authApi';

const ProfileMenuPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
    
  useEffect(() => {
      // BACKEND API INTEGRATION PLACEHOLDER:
      // Fetch user's wishlist from the database
      // fetch('/api/v1/user/wishlist', { headers: { Authorization: `Bearer ${token}` } })
      //   .then(res => res.json())
      //   .then(data => { setWishlistItems(data); setIsLoading(false); })
      //   .catch(err => { console.error(err); setIsLoading(false); });
  
      // Simulating API loading time
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }, []);

  // Logout Handler Function
  const handleLogout = async () => {
    try {
      // Agar backend server par token invalidate/logout karna hai toh yahan API call karein
      // await logout();

      // Catch/Cache Data Remove karna (Local Storage ya Session Storage se)
      localStorage.removeItem("authToken"); // Sirf token hatana ho toh
      // localStorage.clear(); // Agar poora local storage data clear karna ho toh

      // Success message (optional)
      console.log("User logged out successfully, cache cleared.");
      
      // User ko login page par redirect karein
      navigate("/login"); 

    } catch (error) {
      console.error("Logout Error:", error);
      alert("Something went wrong while logging out.");
    }
  };

  const matrixOptions = [
    { label: 'Edit Profile', route: '/profile/edit', icon: <FaUserAlt /> },
    { label: 'Subscription Plans', route: '/subscription', icon: <MdWorkspacePremium /> },
    { label: 'My Downloads', route: '/downloads', icon: <MdDownload /> },
    { label: 'Notifications Stream', route: '#', icon: <FaBell /> },
    { label: 'Personal Wish List', route: '/wishlist', icon: <FaHeart /> },
    { label: 'Privacy Regulations', route: '/privacy-policy', icon: <MdPrivacyTip /> },
    { label: 'Terms & Conditions', route: '/terms', icon: <FaFileAlt />    },
    { label: 'Refund Policy guidelines', route: '/refund-policy', icon: <HiReceiptRefund /> },
    { label: 'Help & Support Desk', route: '/support', icon: <MdHelpCenter /> },
    { label: 'Log Out Session', route: '/login', icon: <IoLogOut />, isLogout: true }
  ];

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      
      {/* Left Column Card Profile Overview Info Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm text-center p-6 md:sticky md:top-24">
        <div className="w-24 h-24 rounded-full border-4 border-brand-light-bg bg-brand-orange text-white text-3xl font-black flex items-center justify-center mx-auto shadow-md mb-4">
          D
        </div>
        <h2 className="text-xl font-extrabold text-gray-800">Deepak</h2>
        <p className="text-sm text-gray-400 font-medium mt-0.5">@gsy262</p>
        <div className="mt-4 p-3 bg-brand-light-bg text-brand-orange rounded-xl text-xs font-bold uppercase tracking-wider">
          Premium Account Member
        </div>
      </div>

      {/* Right Column Core Navigation Grid Panel Block */}
      <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-2">Account Management</h3>
        <div className="divide-y divide-gray-100">
          {matrixOptions.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                // Check if it's the logout button
                if (item.isLogout) {
                  handleLogout();
                } else if (item.route !== '#') {
                  navigate(item.route);
                }
              }}
              className="flex items-center justify-between py-4 px-2 hover:bg-gray-50/50 rounded-xl cursor-pointer transition group"
            >
              <div className="flex items-center gap-4">
                <span className="text-xl w-6 flex items-center justify-center">{item.icon}</span>
                <span className={`text-sm font-bold ${item.isLogout ? 'text-red-500' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </div>
              <span className="text-gray-300 group-hover:text-brand-orange font-bold text-xs transform transition group-hover:translate-x-0.5">
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