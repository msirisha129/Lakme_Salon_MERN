import axios from 'axios';

// Resolve backend URL for development:
// 1) use REACT_APP_API_URL if provided
// 2) if running on localhost, assume backend on port 5001 (user switched backend there)
// 3) fallback to relative '/api'
const defaultHost = window.location.hostname;
const devBackend = process.env.REACT_APP_API_URL || (defaultHost === 'localhost' || defaultHost === '127.0.0.1' ? `http://${defaultHost}:5000/api` : '/api');
const API = axios.create({ baseURL: devBackend });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('lakme_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    // Friendly message for network errors
    if (!err.response) {
      console.error('API Network Error:', err.message);
      // attach a friendly message
      err.message = 'Network Error: Unable to reach backend. Check server (backend) is running.';
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('lakme_token');
      localStorage.removeItem('lakme_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API; 
