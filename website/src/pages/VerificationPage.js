import React, { useState, useEffect } from "react";
import ProfileVerificationSection from "../components/ProfileVerificationSection";
import Loader from "../components/Loader";
import { getUserProfile } from "../api/userApi";

const VerificationPage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const res = await getUserProfile();
        if (res) {
          setUserProfile(res.user || res.data || res);
        }
      } catch (err) {
        console.error("Fetch profile error in VerificationPage:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ProfileVerificationSection userProfile={userProfile} />
      </div>
    </div>
  );
};

export default VerificationPage;
