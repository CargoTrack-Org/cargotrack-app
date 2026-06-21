import axios from 'axios';

// VITE_API_BASE_URL is baked in at build time.
// Default is /api — nginx on the frontend tier proxies this to the backend.
// For direct backend access (no nginx proxy): set VITE_API_BASE_URL=http://<backend-ip>:4000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear session and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const publicPaths = ['/login', '/register'];
      const isPublic = publicPaths.includes(window.location.pathname) ||
        window.location.pathname.startsWith('/track/');
      if (!isPublic) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
