import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

// API base URL'i environment variable'dan al
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5283/api';

// Axios instance oluştur
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 saniye timeout
});

// Request interceptor - Her istekten önce çalışır
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Her yanıttan önce çalışır
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 401 Unauthorized hatası durumunda token'ı temizle ve login sayfasına yönlendir
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
