import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileMenuPage = () => {
  const navigate = useNavigate();

  const matrixOptions = [
    { label: 'Edit Profile', route: '/profile/edit', icon: '👤' },
    { label: 'Subscription Plans', route: '/subscription', icon: '💳' },
    { label: 'My Downloads', route: '/downloads', icon: '⬇️' },
    { label: 'Notifications Stream', route: '#', icon: '🔔' },
    { label: 'Personal Wish List', route: '#', icon: '❤️' },
    { label: 'Privacy Regulations', route: '#', icon: '🛡️' },
    { label: 'Terms & Conditions', route: '#', icon: '📄' },
    { label: 'Refund Policy guidelines', route: '#', icon: '↩️' },
    { label: 'Help & Support Desk', route: '#', icon: 'ℹ️' },
    { label: 'Log Out Session', route: '/', icon: '🚪', isLogout: true }
  ];

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
              onClick={() => item.route !== '#' && navigate(item.route)}
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