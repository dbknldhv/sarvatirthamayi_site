import axios from "axios";
import { API_BASE_URL } from "../utils/config";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 1. Request Interceptor: Attach the token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Token Expiration (401 errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or unauthorized. Cleaning up...");
      
      // Clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // DYNAMIC REDIRECT
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/temple-admin')) {
        window.location.href = "/admin/login";
      } else {
        // FIX: Redirect to /user/login to match your UserRoutes.jsx
        window.location.href = "/user/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;