import React, { createContext, useState, useEffect, useContext, useMemo } from "react";
import { authService } from "../services/authService";
import api from "../api/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const adminUser = localStorage.getItem("admin");
      const normalUser = localStorage.getItem("user");
      return adminUser ? JSON.parse(adminUser) : normalUser ? JSON.parse(normalUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    const root = window.document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const path = window.location.pathname;

        const isAuthPage =
          path === "/admin/login" ||
          path === "/temple-admin/login" ||
          path === "/user/login" ||
          path === "/signup" ||
          path === "/forgot-password";

        if (isAuthPage) {
          setLoading(false);
          return;
        }

        const isAdminArea = path.startsWith("/admin") || path.startsWith("/temple-admin");
        
        // 🎯 FIX 1: THE GATEKEEPER
        // Check if we actually have a token before pinging the backend
        const activeToken = isAdminArea ? localStorage.getItem("adminToken") : localStorage.getItem("token");
        
        if (!activeToken) {
          setUser(null);
          setLoading(false);
          return; // Stop here! This prevents the 401 Unauthorized error!
        }

        const checkPath = isAdminArea
          ? "/admin/auth/check-auth"
          : "/user/profile";

        const res = await api.get(checkPath);

        if (res.data.success) {
          const userData = res.data.user || res.data.data;
          setUser(userData);

          // Keep localStorage in sync just in case profile data changed
          if (isAdminArea) {
            localStorage.setItem("admin", JSON.stringify(userData));
          } else {
            localStorage.setItem("user", JSON.stringify(userData));
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
        // Only clean up if the token is actually invalid/expired
        localStorage.removeItem("admin");
        localStorage.removeItem("user");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    // 1. Call your authService (This handles API call AND saving to localStorage)
    const response = credentials.mobile
      ? await authService.userLogin(credentials.mobile, credentials.password)
      : await authService.adminLogin(credentials.email, credentials.password);

    if (response.success || response.status === "true") {
      const userData = response.user || response.data;
      
      // 2. Set React State
      setUser(userData);

      if (Number(userData?.user_type) === 1 || Number(userData?.user_type) === 2) {
        localStorage.setItem("admin", JSON.stringify(userData));
        localStorage.removeItem("user");
      } else {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.removeItem("admin");
      }

      // 🎯 FIX 2: REMOVED THE DESTRUCTIVE TOKEN REMOVAL LINES HERE
      // We no longer delete the tokens immediately after generating them!
      
      return response;
    }

    throw new Error(response.message || "Login failed");
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      admin: user,
      setUser,
      login,
      logout,
      loading,
      dark,
      setDark,
      authenticated: !!user,
    }),
    [user, loading, dark]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-slate-400 font-serif animate-pulse">Entering Sacred Space...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};