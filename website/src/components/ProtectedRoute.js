import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute = () => {
  const location = useLocation();
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  const isAuthenticated = !!token;

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Parse stored user object to verify profile completion status
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    user = null;
  }

  const isProfileIncomplete = Boolean(user && user.profileComplete === false);
  const isCompleteProfilePage = location.pathname === "/complete-profile";

  // If user has NOT completed profile, force them to complete-profile
  if (isProfileIncomplete && !isCompleteProfilePage) {
    return <Navigate to="/complete-profile" replace />;
  }

  // If profile is already complete, redirect away from complete-profile to home
  if (!isProfileIncomplete && isCompleteProfilePage) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
