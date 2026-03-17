import React, { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronDown, HiMoon, HiSun, HiMenuAlt3, HiX } from "react-icons/hi";
import { FiUser, FiLogOut, FiShoppingBag, FiStar, FiGrid } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, dark, setDark } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === "/";
  const isTransparent = isHomePage && !scrolled;

  const navLinks = [
    { name: "Home", to: "home", isScroll: true, path: "/" },
    { name: "About", path: "/about" },
    { name: "Temples", path: "/user/temples" },
  ];

  const servicesLinks = [
    { name: "Temple Assistant", href: "/user/temple-assistance", icon: <FiUser /> },
    { name: "Divine Rituals", href: "/user/rituals", icon: <FiStar /> },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Helper to get initials safely
  const getUserInitial = () => {
    const name = user?.name || user?.first_name || "U";
    return name[0].toUpperCase();
  };

  return (
    <nav 
      className={`fixed w-full z-[999] transition-all duration-700 
        ${scrolled 
          ? "py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]" 
          : "py-6 bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* --- BRANDING --- */}
        <RouterLink to="/" className="relative group z-[1001]">
          <span className="text-2xl font-black tracking-tighter flex items-center">
            <span className="text-indigo-600 dark:text-amber-400">SARVA</span>
            <span className={`transition-colors duration-500 ${isTransparent ? "text-white" : "text-slate-900 dark:text-white"}`}>
              TIRTHAM
            </span>
          </span>
          <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full" />
        </RouterLink>

        {/* --- DESKTOP MENU --- */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <div key={link.name} className="relative group">
              {link.isScroll && isHomePage ? (
                <ScrollLink
                  to={link.to}
                  smooth={true}
                  className={`cursor-pointer text-sm font-bold uppercase tracking-widest transition-all duration-500 hover:text-indigo-600 ${isTransparent ? "text-white/80" : "text-slate-600 dark:text-slate-400"}`}
                >
                  {link.name}
                </ScrollLink>
              ) : (
                <RouterLink
                  to={link.path}
                  className={`text-sm font-bold uppercase tracking-widest transition-all duration-500 hover:text-indigo-600 ${location.pathname === link.path ? "text-indigo-600" : (isTransparent ? "text-white/80" : "text-slate-600 dark:text-slate-400")}`}
                >
                  {link.name}
                </RouterLink>
              )}
            </div>
          ))}

          <RouterLink 
            to="/user/stm-club" 
            className="group relative px-5 py-2 overflow-hidden rounded-full border border-amber-400/30 bg-amber-400/5 transition-all hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          >
            <span className="relative z-10 text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 group-hover:text-amber-950">
              STM Club
            </span>
          </RouterLink>

          {/* SERVICES DROPDOWN */}
          <div 
            className="relative" 
            onMouseEnter={() => setActiveDropdown('services')} 
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className={`flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest transition-all ${isTransparent ? "text-white/80" : "text-slate-600 dark:text-slate-400"}`}>
              Services <HiChevronDown className={`transition-transform duration-300 ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'services' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-1/2 -translate-x-1/2 mt-4 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-3"
                >
                  {servicesLinks.map(link => (
                    <RouterLink 
                      key={link.name} 
                      to={link.href} 
                      className="flex items-center gap-3 px-5 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all hover:translate-x-1"
                    >
                      <span className="text-indigo-600">{link.icon}</span>
                      {link.name}
                    </RouterLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- RIGHT ACTIONS --- */}
        <div className="flex items-center gap-4 z-[1001]">
          <button 
            onClick={() => setDark(!dark)} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${scrolled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white/10 backdrop-blur-md border border-white/20'}`}
          >
            {dark ? <HiSun className="text-amber-400 text-lg" /> : <HiMoon className={`${isTransparent ? 'text-white' : 'text-slate-800'} text-lg`} />}
          </button>

          {/* User Auth Section */}
          <div className="flex items-center">
            {user ? (
              <div className="relative" onMouseEnter={() => setActiveDropdown('profile')} onMouseLeave={() => setActiveDropdown(null)}>
                <button className="relative group flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <div className="hidden md:block text-right">
                    <p className={`text-[10px] font-black uppercase tracking-tighter ${isTransparent ? 'text-white/60' : 'text-slate-400'}`}>Welcome</p>
                    <p className={`text-xs font-bold ${isTransparent ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{user.name || user.first_name}</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg group-hover:rotate-6 transition-transform">
                    {getUserInitial()}
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
                </button>
                <ProfileDropdown 
                  user={user}
                  isOpen={activeDropdown === 'profile'} 
                  onLogout={handleLogout} 
                />
              </div>
            ) : (
              <RouterLink to="/login" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5">
                Login
              </RouterLink>
            )}
          </div>

          <button 
            className={`lg:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isTransparent ? 'text-white' : 'text-slate-900 dark:text-white'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <HiX size={24} /> : <HiMenuAlt3 size={24} />}
          </button>
        </div>
      </div>

      {/* --- MOBILE OVERLAY --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 bg-white dark:bg-slate-950 z-[1000] lg:hidden p-8 flex flex-col justify-center items-center text-center space-y-8"
          >
            {/* ... Mobile links same as before ... */}
            <div className="space-y-6">
               {user && (
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black mx-auto shadow-2xl mb-2">
                       {getUserInitial()}
                    </div>
                    <p className="text-xl font-bold dark:text-white">{user.name || user.first_name}</p>
                  </div>
               )}
              {navLinks.map((link, idx) => (
                <motion.div key={link.name}>
                  <RouterLink to={link.path} className="text-3xl font-black text-slate-800 dark:text-white italic">{link.name}</RouterLink>
                </motion.div>
              ))}
            </div>
            <button onClick={handleLogout} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-black uppercase tracking-widest">Sign Out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function ProfileDropdown({ user, isOpen, onLogout }) {
  // Determine dashboard path based on user type
  const getDashboardPath = () => {
    if (user?.user_type === 1) return "/admin/dashboard";
    if (user?.user_type === 2) return "/temple-admin/dashboard";
    return "/profile";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 15, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-4"
        >
          <div className="px-4 py-3 mb-2 border-b dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
              {user?.name || user?.first_name || "Divine Member"}
            </p>
            <p className="text-[10px] text-emerald-500 font-bold uppercase">Sovereign Active</p>
          </div>
          
          <RouterLink to={getDashboardPath()} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
            <FiGrid className="text-indigo-600" /> Dashboard
          </RouterLink>
          
          <RouterLink to="/user/rituals" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
            <FiShoppingBag className="text-emerald-500" /> My Bookings
          </RouterLink>

          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all mt-2">
            <FiLogOut /> Sign Out
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}