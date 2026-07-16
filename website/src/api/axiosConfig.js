

import axios from 'axios';

// Apna backend base URL set karein
const API_URL = process.env.REACT_APP_API_URL
const axiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
});

// Request Interceptor: Har API call se pehle ye token attach karega
axiosInstance.interceptors.request.use(
  (config) => {
    // Check karein ki aap token kis naam se save kar rahe hain (e.g., 'token' ya 'authToken')
    // Agar login ke waqt aap 'token' naam se save karte hain, toh yahan wahi naam use karein
    const token = localStorage.getItem('authToken'); // Ya 'authToken'

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: 401 Unauthorized response check karne ke liye
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized request detected! Clearing session and redirecting to login.");
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      localStorage.removeItem("userIsPremium");

      // Redirect to login if not already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;