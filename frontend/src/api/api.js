import axios from "axios";
import { API_BASE_URL } from "../utils/config";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, 
});

// 🛡️ 1. THE REQUEST BOUNCER (You were missing this!)
// This grabs the token from your browser and pins it to every single request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
  
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🛡️ 2. THE RESPONSE BOUNCER
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname;

    const isLoginPage = path === "/admin/login" || path === "/temple-admin/login" || path === "/user/login"; 

    // 🎯 FIX: Added "/membership-card/my-card" so the JoinNow page doesn't crash!
    const isSilentRequest =
      error.config?.url?.includes("/check-auth") ||
      error.config?.url?.includes("/profile") ||
      error.config?.url?.includes("/membership-card/my-card"); 

    if (status === 401 && !isLoginPage && !isSilentRequest) {
      console.warn("Global 401 Triggered. Clearing session.");
      localStorage.removeItem("admin");
      localStorage.removeItem("user");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("token");

      const isAdminArea = path.startsWith("/admin") || path.startsWith("/temple-admin");
      window.location.href = isAdminArea ? "/admin/login" : "/user/login";
    }

    return Promise.reject(error);
  }
);

export default api;