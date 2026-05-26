import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, allowedTypes }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isAdminPath =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/temple-admin");

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} strokeWidth={1.5} />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
          Verifying Divine Access
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={isAdminPath ? "/admin/login" : "/user/login"}
        state={{ from: location }}
        replace
      />
    );
  }

  const roleType = Number(user?.user_type);

  if (allowedTypes && !allowedTypes.includes(roleType)) {
    if (roleType === 1) return <Navigate to="/admin/dashboard" replace />;
    if (roleType === 2) return <Navigate to="/temple-admin/dashboard" replace />;

    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;