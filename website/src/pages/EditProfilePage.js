import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera } from "react-icons/fa";
import Loader from '../components/Loader';

// APIs import karein
import { getUserProfile, updateProfile } from '../api/userApi';

const EditProfilePage = () => {
  const navigate = useNavigate();

  // Form States
  const [formProfile, setFormProfile] = useState({
    name: '', // API me usually 'name' hota hai 'fullName' ki jagah
    username: '',
    phone: '',
    bio: ''
  });

  // Image States
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // UI & Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch Existing Profile Data on Component Mount
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const response = await getUserProfile();
        const user = response?.user || response?.data || response;

        if (user) {
          setFormProfile({
            name: user.name || '',
            username: user.username || '',
            phone: user.phone || user.mobileNumber || '',
            bio: user.bio || ''
          });
          
          if (user.profileImage) {
            setImagePreview(user.profileImage);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        if (error.response && error.response.status === 401) {
          navigate('/login');
        } else {
          setFeedback({ type: 'error', message: 'Failed to load profile data.' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  // Handle Text Input Changes
  const handleFieldMutation = (e) => {
    const { name, value } = e.target;
    setFormProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle Image File Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); // Local preview dikhane ke liye
    }
  };

  // Execute Save Request
  const executeDataSave = async () => {
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      // Create FormData because we might be sending an image file
      const formData = new FormData();
      formData.append('name', formProfile.name);
      formData.append('username', formProfile.username);
      formData.append('phone', formProfile.phone);
      formData.append('bio', formProfile.bio);
      
      // Agar naya image select kiya hai toh hi append karein
      if (imageFile) {
        formData.append('profileImage', imageFile);
      }

      await updateProfile(formData);

      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      
      // Thodi der baad automatically profile page par bhej dein
      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (error) {
      console.error("Error updating profile:", error);
      setFeedback({ type: 'error', message: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loader />;

  // Display initial letter if no image exists
  const initial = formProfile.name ? formProfile.name.charAt(0).toUpperCase() : 'U';

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
            <div className="w-full h-full rounded-full bg-brand-orange text-white text-4xl font-black flex items-center justify-center shadow-md border-2 border-white overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-brand-orange text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm cursor-pointer shadow-md hover:scale-110 transform transition">
              <FaCamera />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          <span className="text-xs font-semibold text-gray-400 mt-3">Click icon indicator to mutate profile image</span>
        </div>

        {/* Inputs Entry Form Block Matrix */}
        <div className="p-6 space-y-5">
          
          {/* Feedback Message Indicator */}
          {feedback.message && (
            <div className={`p-3 rounded-xl text-xs font-bold text-center ${
              feedback.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {feedback.message}
            </div>
          )}

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Full Name Tag</label>
            <input 
              type="text" 
              name="name" 
              value={formProfile.name} 
              onChange={handleFieldMutation} 
              className="w-full p-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-brand-orange text-sm sm:text-base" 
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Username Alias</label>
            <input 
              type="text" 
              name="username" 
              value={formProfile.username} 
              onChange={handleFieldMutation} 
              className="w-full p-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-brand-orange text-sm sm:text-base" 
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Phone Link Sequence</label>
            <input 
              type="text" 
              name="phone" 
              value={formProfile.phone} 
              onChange={handleFieldMutation} 
              className="w-full p-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-brand-orange text-sm sm:text-base" 
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Biography Summary Description</label>
            <textarea 
              name="bio" 
              placeholder="Provide profile background summaries..." 
              value={formProfile.bio} 
              onChange={handleFieldMutation} 
              rows="3" 
              className="w-full p-3 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-brand-orange text-sm sm:text-base resize-none" 
            />
          </div>
        </div>
      </div>

      {/* Persistent Execution Footer Control Module */}
      <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
        <button 
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white text-sm sm:text-base font-bold py-3.5 px-6 rounded-xl shadow-md transition transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2" 
          onClick={executeDataSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving Modifications...
            </>
          ) : (
            "Save Data Profile Modifications"
          )}
        </button>
      </div>
    </div>
  );
};

export default EditProfilePage;