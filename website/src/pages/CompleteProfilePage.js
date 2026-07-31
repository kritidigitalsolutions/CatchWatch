import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaUser, FaAt, FaFilm, FaCheckCircle, FaStar } from "react-icons/fa";
import { toast } from "react-toastify";
import { completeProfile } from "../api/userApi";

const AVAILABLE_GENRES = [
  "Drama",
  "Action",
  "Comedy",
  "Romance",
  "Thriller",
  "Sci-Fi",
  "Horror",
  "Animation",
  "Documentary",
];

const CompleteProfilePage = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedGenres, setSelectedGenres] = useState(["Drama"]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.warning("File size should be less than 10MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Genre Toggle Handler
  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length === 1) {
        toast.info("At least one genre should be selected.");
        return;
      }
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning("Please enter your full name.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (username.trim()) {
        formData.append("username", username.trim());
      }
      if (bio.trim()) {
        formData.append("bio", bio.trim());
      }
      formData.append("genres", JSON.stringify(selectedGenres));
      if (imageFile) {
        formData.append("profileImage", imageFile);
      }

      const response = await completeProfile(formData);

      if (response && response.success !== false) {
        toast.success(response.message || "Profile completed successfully! 🎉");
        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
        }
        navigate("/", { replace: true });
      } else {
        toast.error(response.message || "Failed to complete profile. Please try again.");
      }
    } catch (error) {
      console.error("Complete Profile Error:", error);
      const errMsg = error.response?.data?.message || "Error completing profile. Please try again.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-brand-orange/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-xl bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-8 my-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs font-bold rounded-full uppercase tracking-wider">
            <FaStar /> Welcome to Catch & Watch
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white">Complete Your Profile</h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium">
            Set up your profile to customize recommendations & unlock community features.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-full border-2 border-brand-orange/50 p-1 shadow-xl bg-neutral-900 overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <FaUser className="text-neutral-600 text-4xl" />
                )}
              </div>
              <label
                htmlFor="profileImageInput"
                className="absolute bottom-0 right-0 w-9 h-9 bg-brand-orange hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition transform hover:scale-110"
              >
                <FaCamera className="text-sm" />
              </label>
              <input
                id="profileImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <span className="text-[11px] text-neutral-400 font-semibold">Upload Profile Photo (Optional)</span>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Full Name <span className="text-brand-orange">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-neutral-500">
                <FaUser />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-11 pr-4 py-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl text-sm font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-brand-orange transition"
              />
            </div>
          </div>

          {/* Username (Optional with auto-gen info) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Username <span className="text-neutral-500 text-[10px] font-normal">(Optional)</span>
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-neutral-500">
                <FaAt />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_morgan (leave blank to auto-generate)"
                className="w-full pl-11 pr-4 py-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl text-sm font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-brand-orange transition"
              />
            </div>
            <p className="text-[11px] text-neutral-400 font-medium pl-1">
              ✨ If left blank, a unique username like <strong className="text-amber-400">@{name ? name.toLowerCase().replace(/\s+/g, "_") || "user" : "user"}_1234</strong> will be generated automatically.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Bio / About You <span className="text-neutral-500 text-[10px] font-normal">(Optional)</span>
            </label>
            <textarea
              rows="3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share a short bio about your movie preferences or creative passion..."
              className="w-full p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl text-sm font-medium text-white placeholder-neutral-500 focus:outline-none focus:border-brand-orange transition resize-none"
            />
          </div>

          {/* Favorite Genres Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <FaFilm className="text-brand-orange" /> Favorite Genres / Categories
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-brand-orange text-white border-brand-orange shadow-md"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    {isSelected && <FaCheckCircle className="text-xs" />}
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-xl transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? "Saving Profile..." : "Complete & Continue ➔"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
