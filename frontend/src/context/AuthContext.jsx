import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { authService } from '../services/authService';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // --- 1. INITIAL STATE (Hydrate from LocalStorage) ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // --- 2. DARK MODE LOGIC ---
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

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

  // --- 3. CROSS-TAB SESSION SYNC ---
  useEffect(() => {
    const syncSession = (e) => {
      if (e.key === 'user' || e.key === 'token') {
        if (!e.newValue) {
          setUser(null); // Someone logged out in another tab
        } else {
          window.location.reload(); // Re-sync state
        }
      }
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  // --- 4. INITIAL AUTH VALIDATION (The "Redirect Fix") ---
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // FIX: Always use the unified admin auth check route for admins
        // This ensures the sidebar doesn't redirect on route changes
        const res = await api.get('/admin/auth/check-auth'); 

        if (res.data.success) {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.error("Session validation failed:", err);
        // Only wipe session if the server says the token is actually 401 (Expired)
        if (err.response?.status === 401) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // --- 5. LOGIN HANDLER ---
  const login = async (credentials) => {
    try {
      let response;
      if (credentials.mobile) {
        response = await authService.userLogin(credentials.mobile, credentials.password);
      } else {
        response = await authService.adminLogin(credentials.email, credentials.password);
      }

      if (response.success) {
        // authService.setSession handles localStorage
        authService.setSession(response);
        setUser(response.user);
        return response;
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Login failed";
      throw errorMsg;
    }
  };

  // --- 6. LOGOUT HANDLER ---
  const logout = () => {
    authService.logout(); // Clears cookies and localStorage
    setUser(null);
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
      {!loading ? (
        children
      ) : (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-600 border-opacity-50"></div>
            <p className="text-slate-500 font-medium">Verifying Session...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);