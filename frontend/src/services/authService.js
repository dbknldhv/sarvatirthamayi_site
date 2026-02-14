import api from "../api/api";

export const adminLogin = async (email, password) => {
  const response = await api.post("/admin/auth/login", { email, password });
  // Unified session storage inside the service
  if (response.data.success) {
    authService.setSession(response.data);
  }
  return response.data;
};

export const userLogin = async (mobile, password) => {
  const response = await api.post("/user/login", { mobile, password });
  if (response.data.success) {
    authService.setSession(response.data);
  }
  return response.data;
};

export const authService = {
  adminLogin,
  userLogin,

  /**
   * REFRESH TOKEN: Automatically called by Axios interceptor
   */
  refreshToken: async () => {
    try {
      const response = await api.get("/admin/auth/refresh");
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        return response.data.token;
      }
    } catch (error) {
      authService.logout(); // Kill session if refresh fails
      return null;
    }
  },

  setSession: (data) => {
    if (data.token) localStorage.setItem("token", data.token);
    if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
  },

  logout: async () => {
    try {
      // Notify backend to clear the HttpOnly cookie
      await api.post("/admin/auth/logout");
    } catch (e) {
      console.error("Logout notification failed");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const isAdminPath = window.location.pathname.startsWith("/admin") || 
                          window.location.pathname.startsWith("/temple-admin");
      
      window.location.href = isAdminPath ? "/admin/login" : "/login";
    }
  },

  getToken: () => localStorage.getItem("token"),

  getUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * AUTH CHECK: Verifies if current user type matches allowed route access
   */
  isAuthenticated: (allowedTypes = []) => {
    const user = authService.getUser();
    const token = authService.getToken();
    
    if (!token || !user) return false;
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.user_type)) return false;
    
    return true;
  }
};