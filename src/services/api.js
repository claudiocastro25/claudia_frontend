import axios from 'axios';

// Base URL com o sufixo /api para garantir o formato correto dos endpoints
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
});

// Add interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear auth data on 401/403 errors
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;