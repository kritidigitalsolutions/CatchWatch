// import axios from "axios";

// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// const axiosInstance = axios.create({
//   baseURL: `${API_URL}/api`,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// export default axiosInstance;


import axios from 'axios';

// Apna backend base URL set karein
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // End me /api zaroor lagayein agar routes me /api/ hai
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

export default axiosInstance;