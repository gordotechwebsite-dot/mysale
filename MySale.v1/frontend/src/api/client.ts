import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    if (
      !config._retryCount &&
      !error.response &&
      (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')
    ) {
      config._retryCount = 0;
    }
    if (config._retryCount !== undefined && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export default api;
