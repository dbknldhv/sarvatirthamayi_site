import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; 
import logo from "../../assets/favicon.ico";
import backgroundImage from "../../assets/Admin_bg.jpg"; 
import { Eye, EyeOff, Loader2, AlertCircle, Sun, Moon } from "lucide-react";

export default function AdminLogin() {
  const { user, login, logout, dark, setDark } = useAuth(); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // 🔍 Detect Portal Type based on URL
  const isTempleLogin = location.pathname.includes("temple-admin");

  // 🛡️ Auto-Redirect: If user state is populated, send them to their respective dashboard
  useEffect(() => {
    if (user) {
      if (user.user_type === 1) {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.user_type === 2) {
        navigate("/temple-admin/dashboard", { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Execute login via AuthContext
      const response = await login({ email, password });
      
      if (response && response.user) {
        const userType = response.user.user_type;

        // 2. Portal Validation (Guard Rails)
        // User Type 1 = Super Admin, User Type 2 = Temple Admin
        if (isTempleLogin && userType !== 2) {
          await logout(); 
          throw new Error("Access Denied: This account is not a Temple Admin.");
        }
        if (!isTempleLogin && userType !== 1) {
          await logout(); 
          throw new Error("Access Denied: Please use the Temple Admin portal.");
        }

        // 3. Immediate Navigation feedback
        const target = userType === 1 ? "/admin/dashboard" : "/temple-admin/dashboard";
        navigate(target, { replace: true });
      }
    } catch (err) {
      // 🛠️ Intelligent Error Parsing
      let msg = "Invalid email or password.";
      
      if (err.response?.status === 404) {
        msg = "Backend Error: Login endpoint not found (404).";
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (typeof err === "string") {
        msg = err;
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 transition-colors duration-500 relative"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        {/* Dynamic Dark/Light Overlay */}
        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-[2px]"></div>

        <div className="relative w-full max-w-md bg-white/10 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50 overflow-hidden">
          
          {/* Decorative Glow */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
          
          <div className="flex justify-end mb-2 relative z-10">
            <button
              type="button"
              onClick={() => setDark(!dark)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="relative z-10 text-center">
            <img src={logo} alt="Logo" className="w-20 mx-auto mb-4 drop-shadow-lg" />

            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              {isTempleLogin ? "Temple Admin" : "Super Admin"}
            </h2>
            <p className="text-sm text-indigo-100/80 mb-8 font-medium">
              {isTempleLogin 
                ? "Manage your temple activities and bookings" 
                : "Full system control and management"}
            </p>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 flex items-center gap-3 bg-red-500/20 backdrop-blur-md text-red-100 p-4 rounded-xl text-sm border border-red-500/50 animate-in fade-in slide-in-from-top-2 text-left">
                <AlertCircle size={18} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-[2px] ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@stmclub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 outline-none transition-all"
                />
              </div>

              {/* Password Field */}
              {/* Password Field */}
<div className="space-y-2 relative">
  <label className="text-[10px] font-bold text-white/70 uppercase tracking-[2px] ml-1">
    Password
  </label>
  <div className="relative group"> {/* Added group for potential hover effects */}
    <input
      type={showPassword ? "text" : "password"}
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
      // Added pr-12 to ensure text doesn't go under the eye icon
      className="w-full px-4 pr-12 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 outline-none transition-all appearance-none"
    />
    
  </div>
</div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full group relative flex items-center justify-center gap-2 py-4 rounded-xl font-bold shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 text-white ${
                  isTempleLogin 
                  ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400" 
                  : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    {isTempleLogin ? "Temple Login" : "Admin Login"}
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}