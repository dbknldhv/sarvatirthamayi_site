import api from "../api/api";

/**
 * AUTH SERVICE
 * Handles namespaced storage for Devotees and Admins to prevent session overwriting.
 */

export const adminLogin = async (email, password) => {
  const response = await api.post("/admin/auth/login", { email, password });
  if (response.data.success) {
    // Save as Admin session
    authService.setSession(response.data, 'admin');
  }
  return response.data;
};

export const userLogin = async (mobile, password) => {
  // 🎯 CHANGE: Ensure the key 'mobile_number' matches your Backend Model
  const response = await api.post("/user/login", { 
    mobile_number: mobile, 
    password: password 
  });
  
  if (response.data.success) {
    authService.setSession(response.data, 'user');
  }
  return response.data;
};

export const authService = {
  adminLogin,
  userLogin,

  /**
   * SET SESSION: Namespaces token and user data based on role
   */
  setSession: (data, role = 'user') => {
    if (role === 'admin') {
      if (data.token) localStorage.setItem("adminToken", data.token);
      if (data.user) localStorage.setItem("admin", JSON.stringify(data.user));
    } else {
      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
    }
  },

  /**
   * LOGOUT: Targeted cleanup based on current path or explicit role
   */
  logout: async (role = null) => {
    const currentPath = window.location.pathname;
    // Determine role from path if not explicitly provided
    const targetRole = role || (currentPath.startsWith("/admin") || currentPath.startsWith("/temple-admin") ? 'admin' : 'user');

    try {
      // Notify backend to clear HttpOnly cookies for the specific role
      const logoutUrl = targetRole === 'admin' ? "/admin/auth/logout" : "/auth/logout";
      await api.post(logoutUrl);
    } catch (e) {
      console.error(`${targetRole} Logout notification failed`);
    } finally {
      // Targeted cleanup
      if (targetRole === 'admin') {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("admin");
        window.location.href = "/admin/login";
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/user/login";
      }
    }
  },

  /**
   * GETTERS: Specialized for different roles
   */
  getToken: (role = 'user') => {
    return role === 'admin' ? localStorage.getItem("adminToken") : localStorage.getItem("token");
  },

  getUser: (role = 'user') => {
    try {
      const key = role === 'admin' ? "admin" : "user";
      const userData = localStorage.getItem(key);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * AUTH CHECK: Checks current role's session and type permissions
   */
  isAuthenticated: (allowedTypes = []) => {
    const currentPath = window.location.pathname;
    const isAdminArea = currentPath.startsWith("/admin") || currentPath.startsWith("/temple-admin");
    const role = isAdminArea ? 'admin' : 'user';

    const user = authService.getUser(role);
    const token = authService.getToken(role);
    
    if (!token || !user) return false;

    // Check if user_type matches permissions (e.g., 1 for Admin, 2 for Temple Admin, 3 for User)
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.user_type)) {
      return false;
    }
    
    return true;
  }
};