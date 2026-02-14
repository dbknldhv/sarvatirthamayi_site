import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, allowedTypes }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // 1. Permanent Browser Checks (even if Context is in flux)
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  // 2. Cross-Tab Security
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") {
        // If someone logs out or changes accounts in another tab, 
        // reload this tab to prevent data corruption.
        window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 3. The Loading Guard
  // Shows a clean spinner while AuthContext.js:initAuth() is running.
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-slate-900">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  // 4. SESSION VALIDATION
  // If we have NO user in context AND no token in browser, the session is dead.
  if (!user && !token) {
    const isAdminPath = location.pathname.startsWith("/admin") || location.pathname.startsWith("/temple-admin");
    return (
      <Navigate 
        to={isAdminPath ? "/admin/login" : "/user/login"} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 5. HYDRATION GUARD (The Redirect Fix)
  // If token exists but Context hasn't finished setting the 'user' state, 
  // we stay on the loader instead of jumping to the Login page.
  if (!user && token) {
    return (
       <div className="h-screen w-full flex items-center justify-center">
         <Loader2 className="animate-spin text-purple-600" size={40} />
       </div>
    );
  }

  // 6. ROLE-BASED AUTHORIZATION
  // 1: Super Admin, 2: Temple Admin, 3: User
  const currentUserType = Number(user?.user_type);

  if (allowedTypes && !allowedTypes.includes(currentUserType)) {
    console.warn(`Unauthorized access attempt to ${location.pathname}`);
    
    // Send them to their respective "Home" rather than Login
    if (currentUserType === 1) return <Navigate to="/admin/dashboard" replace />;
    if (currentUserType === 2) return <Navigate to="/temple-admin/dashboard" replace />;
    
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;