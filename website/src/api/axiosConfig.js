import axios from 'axios';

const rawBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, '');
const baseURL = normalizedBaseUrl.endsWith('/api')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`;

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
