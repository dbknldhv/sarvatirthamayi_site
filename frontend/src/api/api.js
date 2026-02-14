import axios from "axios";
import { API_BASE_URL } from "../utils/config";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // CRITICAL: Allows the browser to send/receive the HttpOnly Refresh Cookie
  withCredentials: true, 
});

// 1. Request Interceptor: Attach the token
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

// 2. Response Interceptor: Handle Auto-Update Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { response } = error;

    // --- REFRESH LOGIC ---
    // If 401 (Expired) and we haven't tried refreshing this specific request yet
    if (response && response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark to prevent infinite loop

      const currentPath = window.location.pathname;
      const isAuthPage = ["/login", "/verify-otp", "/signup"].some(p => currentPath.includes(p));

      if (isAuthPage) return Promise.reject(error);

      try {
        console.log("🔄 Access Token expired. Attempting refresh...");
        
        // Call the refresh endpoint
        // Note: Using axios directly to avoid the interceptor loop
        const refreshRes = await axios.get(`${API_BASE_URL}/admin/auth/refresh`, {
          withCredentials: true 
        });

        if (refreshRes.data.success) {
          const newToken = refreshRes.data.token;
          localStorage.setItem("token", newToken);
          
          // Update the header and retry the original request (e.g., the User List fetch)
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("❌ Session expired. Redirecting to login...");
        
        // If refresh fails, cleanup and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        const isAdminArea = currentPath.startsWith('/admin') || currentPath.startsWith('/temple-admin');
        window.location.href = isAdminArea ? "/admin/login" : "/user/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;