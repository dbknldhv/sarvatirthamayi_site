import api from "../api/api";

export const adminLogin = async (email, password) => {
  const response = await api.post("/admin/auth/login", {
    email,
    password,
  });

  if (response.data.success || response.data.status === "true") {
    authService.setSession(response.data, "admin");
  }

  return response.data;
};

export const userLogin = async (mobile, password) => {
  const response = await api.post("/user/login", {
    mobile: mobile,
    password: password,
  });

  if (response.data.success || response.data.status === "true") {
    authService.setSession(response.data, "user");
  }

  return response.data;
};

export const userSignup = async (userData) => {
  const payload = {
    first_name: userData.firstName || userData.first_name,
    last_name: userData.lastName || userData.last_name || "",
    email: userData.email,
    mobile_number: userData.mobileNumber || userData.mobile_number || userData.mobile, 
    password: userData.password
  };
  
  const response = await api.post("/user/signup", payload);
  return response.data;
};

export const authService = {
  adminLogin,
  userLogin,
  userSignup,

  setSession: (responseData, role = "user") => {
    // 🎯 FIX 1: Smart extraction. It checks for '.user' first, then '.data'
    const userObj = responseData.user || responseData.data;
    
    // 🎯 FIX 2: Smart token extraction. It checks for '.token' first.
    const tokenStr = responseData.token || responseData.data?.access_token || responseData.data?.accessToken;

    if (role === "admin") {
      if (userObj) {
        localStorage.setItem("admin", JSON.stringify(userObj));
      }
      // 🎯 FIX 3: Actually SAVE the token instead of deleting it!
      if (tokenStr) {
        localStorage.setItem("adminToken", tokenStr); 
      }
    } else {
      if (userObj) {
        localStorage.setItem("user", JSON.stringify(userObj));
      }
      // 🎯 FIX 3: Actually SAVE the token instead of deleting it!
      if (tokenStr) {
        localStorage.setItem("token", tokenStr); 
      }
    }
  },

  logout: async (role = null) => {
    const currentPath = window.location.pathname;
    const targetRole =
      role ||
      (currentPath.startsWith("/admin") || currentPath.startsWith("/temple-admin")
        ? "admin"
        : "user");

    try {
      const logoutUrl =
        targetRole === "admin" ? "/admin/auth/logout" : "/auth/logout";

      await api.post(logoutUrl);
    } catch (e) {
      console.error(`${targetRole} logout failed`);
    } finally {
      // Clear absolutely everything on logout
      localStorage.removeItem("admin");
      localStorage.removeItem("user");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("token");

      window.location.href =
        targetRole === "admin" ? "/admin/login" : "/user/login";
    }
  },

  getUser: (role = "user") => {
    try {
      const key = role === "admin" ? "admin" : "user";
      const userData = localStorage.getItem(key);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },
};