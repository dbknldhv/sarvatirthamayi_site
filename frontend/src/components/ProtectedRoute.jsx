import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * PROTECTED ROUTE
 * Optimized for Dual-Session Management (Devotee & Admin isolation)
 */
const ProtectedRoute = ({ children, allowedTypes }) => {
  const { user, admin, loading } = useAuth();
  const location = useLocation();
  
  // 1. Determine Context (Are we protecting an Admin route or a User route?)
  const isAdminPath = location.pathname.startsWith("/admin") || location.pathname.startsWith("/temple-admin");
  
  // 2. Role-Based Token Check
  // Admins use 'adminToken', Devotees use 'token'
  const activeToken = isAdminPath ? localStorage.getItem("adminToken") : localStorage.getItem("token");
  const currentUser = isAdminPath ? admin : user;

  // 3. Cross-Tab Security Sync
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only reload if the relevant token/user for this specific route changed
      const relevantKeys = isAdminPath ? ["adminToken", "admin"] : ["token", "user"];
      if (relevantKeys.includes(e.key)) {
        window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isAdminPath]);

  // 4. Loading Guard
  // Prevents "flicker" while the AuthContext is validating tokens with the backend
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} strokeWidth={1.5} />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Verifying Divine Access</p>
      </div>
    );
  }

  // 5. Authentication Check
  // If no user object exists and no token is found in localStorage
  if (!currentUser && !activeToken) {
    return (
      <Navigate 
        to={isAdminPath ? "/admin/login" : "/user/login"} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 6. Hydration Guard
  // If a token exists but the server hasn't finished sending the user profile yet
  if (!currentUser && activeToken) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // 7. Role-Based Authorization
  // user_type: 1 (Super Admin), 2 (Temple Admin), 3 (Devotee)
  const roleType = Number(currentUser?.user_type);

  if (allowedTypes && !allowedTypes.includes(roleType)) {
    console.warn(`Unauthorized access attempt: ${roleType} tried to access ${location.pathname}`);
    
    // Safety Redirects: Send them to their own authorized dashboard
    if (roleType === 1) return <Navigate to="/admin/dashboard" replace />;
    if (roleType === 2) return <Navigate to="/temple-admin/dashboard" replace />;
    
    return <Navigate to="/" replace />;
  }

  // 8. Access Granted
  return children;
};

export default ProtectedRoute;