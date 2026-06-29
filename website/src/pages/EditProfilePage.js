import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EditProfilePage = () => {
  const navigate = useNavigate();

  const [formProfile, setFormProfile] = useState({
    fullName: 'Deepak',
    username: '@gsy262',
    phone: '+918273243959',
    bio: ''
  });

  const handleFieldMutation = (e) => {
    const { name, value } = e.target;
    setFormProfile(prev => ({ ...prev, [name]: value }));
  };

  const executeDataSave = () => {
    alert('Saving user settings profiles inside API Backend Endpoint Data Map...');
    navigate('/profile');
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between min-h-[80vh]">
      <div>
        {/* Workspace Banner Segment */}
        <div className="bg-brand-orange text-white p-5 sm:p-6 flex items-center gap-4">
          <button className="text-2xl font-bold cursor-pointer hover:scale-105 transition" onClick={() => navigate('/profile')}>←</button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Modify Settings Profile</h1>
        </div>

        {/* User Interactive Photo Interface Display Section */}
        <div className="p-6 border-b border-gray-100 flex flex-col items-center bg-gray-50/50">
          <div className="relative w-24 h-24 group">
            <div className="w-full h-full rounded-full bg-brand-orange text-white text-3xl font-black flex items-center justify-center shadow-md border-2 border-white">
              D
            </div>
            <label className="absolute bottom-0 right-0 bg-brand-orange text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm cursor-pointer shadow-md hover:scale-110 transform transition">
              📷
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
          <span className="text-xs font-semibold text-gray-400 mt-3">Click icon indicator to mutate profile image</span>
        </div>

        {/* Inputs Entry Form Block Matrix */}
        <div className="p-6 space-y-5">
          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Full Name Tag</label>
            <input type="text" name="fullName" value={formProfile.fullName} onChange={handleFieldMutation} className="w-full p-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-brand-orange text-sm sm:text-base" />
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Username Alias</label>
            <input type="text" name="username" value={formProfile.username} onChange={handleFieldMutation} className="w-full p-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-brand-orange text-sm sm:text-base" />
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Phone Link Sequence</label>
            <input type="text" name="phone" value={formProfile.phone} onChange={handleFieldMutation} className="w-full p-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-brand-orange text-sm sm:text-base" />
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Biography Summary Description</label>
            <textarea name="bio" placeholder="Provide profile background summaries..." value={formProfile.bio} onChange={handleFieldMutation} rows="3" className="w-full p-3 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-brand-orange text-sm sm:text-base resize-none" />
          </div>
        </div>
      </div>

      {/* Persistent Execution Footer Control Module */}
      <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
        <button className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white text-sm sm:text-base font-bold py-3.5 px-6 rounded-xl shadow-md transition transform active:scale-[0.99]" onClick={executeDataSave}>
          Save Data Profile Modifications
        </button>
      </div>
    </div>
  );
};

export default EditProfilePage;