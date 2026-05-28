import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('lakme_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lakme_token');
      localStorage.removeItem('lakme_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
