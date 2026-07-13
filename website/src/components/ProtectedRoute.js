import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Check if the user is authenticated. 
  // Adjust this logic based on where you save your auth token.
  const isAuthenticated = localStorage.getItem("authToken") !== null;

  // If they are NOT logged in, redirect them to the login page.
  // We use the <Navigate /> component here because we are inside the render cycle.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If they ARE logged in, render the child routes using <Outlet />
  return <Outlet />;
};

export default ProtectedRoute;