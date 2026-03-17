import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { authService } from '../services/authService';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // --- 1. INITIAL STATE ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  // --- 2. THEME EFFECT ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // --- 3. SESSION VALIDATION ---
  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        /**
         * 🎯 FIX: Match the actual property from your User model (user_type)
         * If type is 1 (Admin) or 2 (Temple), use the admin route.
         */
        const isAdmin = user?.user_type === 1 || user?.user_type === 2 || user?.role === 'admin';
        const checkPath = isAdmin ? '/admin/profile' : '/user/profile';

        const res = await api.get(checkPath); 

        if (res.data.success) {
          const userData = res.data.user || res.data.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (err) {
        console.error("Session invalid:", err.message);
        if (err.response?.status === 401) {
          logout(); // 🎯 Wipe local data if token expired
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // --- 4. LOGIN HANDLER ---
  const login = async (credentials) => {
    try {
      let response;
      // Handle User vs Admin login based on input fields
      if (credentials.mobile) {
        response = await authService.userLogin(credentials.mobile, credentials.password);
      } else {
        response = await authService.adminLogin(credentials.email, credentials.password);
      }

      if (response.success) {
        // 🎯 CRITICAL: authService.setSession handles localStorage.setItem('token', ...)
        authService.setSession(response); 
        
        const userData = response.user || response.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return response; // 🎯 Ensure response is returned to the UI for navigate()
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      // Re-throw so the UI (UserLogin.jsx) can catch and show the error message
      throw error; 
    }
  };

  // --- 5. LOGOUT HANDLER ---
  const logout = () => {
    authService.logout(); // Removes token and user from localStorage
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = useMemo(() => ({
    user,
    setUser,
    login,
    logout,
    loading,
    dark,
    setDark,
    authenticated: !!user 
  }), [user, loading, dark]);

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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};