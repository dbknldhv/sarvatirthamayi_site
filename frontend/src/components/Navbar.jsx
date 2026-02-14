import React, { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronDown, HiMoon, HiSun, HiMenu, HiX } from "react-icons/hi";
import { FiUser, FiLogOut, FiHeart } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, dark, setDark } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // --- CONFIGURATION ---
  const authPaths = ["/user/login", "/signup", "/verify-otp", "/forgot-password", "/admin/login"];
  const isHomePage = location.pathname === "/";
  const isTransparent = isHomePage && !scrolled;

  // Dynamic text color based on scroll and page
  const textColor = isTransparent 
    ? "text-white" 
    : "text-slate-900 dark:text-slate-100";

  const servicesLinks = [
    { name: "Temple Assistant", href: "/user/temple-assistance" },
    { name: "Rituals", href: "/user/rituals" },
  ];

  // --- SCROLL EFFECT ---
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/user/login");
  };

  return (
    <nav 
      className={`fixed w-full z-[999] transition-all duration-500 px-4 md:px-8 py-4 
        ${scrolled ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`}
    >
      <div className="max-w-[1400px] mx-auto flex justify-between items-center">
        
        {/* BRAND LOGO */}
        <RouterLink to="/" className="text-2xl font-black tracking-tighter text-indigo-600 dark:text-amber-400 z-[1001]">
          SARVA<span className={textColor}>TIRTHAM</span>
        </RouterLink>

        {/* --- DESKTOP NAVIGATION --- */}
        <div className="hidden lg:flex items-center gap-8">
          
          {/* HOME LINK: Hybrid logic (Scroll on home page, route if elsewhere) */}
          {isHomePage ? (
            <ScrollLink 
              to="home" 
              smooth={true} 
              duration={500} 
              className={`font-semibold cursor-pointer hover:text-indigo-500 transition-colors ${textColor}`}
            >
              Home
            </ScrollLink>
          ) : (
            <RouterLink to="/" className={`font-semibold hover:text-indigo-500 transition-colors ${textColor}`}>
              Home
            </RouterLink>
          )}

          {/* ABOUT LINK: Simple redirect (Just like Temples) */}
          <RouterLink 
            to="/about" 
            className={`font-semibold hover:text-indigo-500 transition-colors ${textColor}`}
          >
            About
          </RouterLink>

          <RouterLink to="/user/temples" className={`font-semibold hover:text-indigo-500 transition-colors ${textColor}`}>
            Temples
          </RouterLink>

          <RouterLink to="/user/stm-club" className="font-bold text-indigo-600 dark:text-amber-400 hover:scale-105 transition-transform">
            STM Club
          </RouterLink>

          {/* SERVICES DROPDOWN */}
          <div 
            className="relative group" 
            onMouseEnter={() => setActiveDropdown('services')} 
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className={`flex items-center gap-1 font-semibold hover:text-indigo-500 transition-colors ${textColor}`}>
              Services <HiChevronDown className={`transition-transform duration-300 ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'services' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-2 ring-1 ring-black/5"
                >
                  {servicesLinks.map(link => (
                    <RouterLink 
                      key={link.name} 
                      to={link.href} 
                      className="block px-4 py-3 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-slate-700/50 rounded-xl dark:text-gray-200 transition-colors"
                    >
                      {link.name}
                    </RouterLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- RIGHT SIDE ACTIONS --- */}
        <div className="flex items-center gap-3 z-[1001]">
          {/* Theme Toggle */}
          <button 
            onClick={() => setDark(!dark)} 
            className={`p-2.5 rounded-full transition-all active:scale-90 ${scrolled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white/10 backdrop-blur-md'}`}
          >
            {dark 
              ? <HiSun className="text-amber-400 text-xl" /> 
              : <HiMoon className={`${scrolled ? 'text-slate-800' : 'text-white'} text-xl`} />
            }
          </button>

          {/* User Profile / Login */}
          <div className="hidden sm:block">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'profile' ? null : 'profile')} 
                  className="flex items-center gap-2 ring-2 ring-indigo-600/20 rounded-full p-0.5"
                >
                  <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-black shadow-lg">
                    {user.first_name?.[0].toUpperCase() || 'U'}
                  </div>
                </button>
                <ProfileDropdown isOpen={activeDropdown === 'profile'} onLogout={handleLogout} />
              </div>
            ) : (
              <RouterLink to="/user/login" className="bg-indigo-600 text-white px-7 py-2.5 rounded-full text-sm font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                Login
              </RouterLink>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={`lg:hidden p-2 transition-colors ${textColor}`} 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <HiX size={30} /> : <HiMenu size={30} />}
          </button>
        </div>
      </div>

      {/* --- MOBILE OVERLAY MENU --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[300px] bg-white dark:bg-slate-900 shadow-2xl lg:hidden z-[1000] p-8 flex flex-col"
            >
              <div className="mt-16 space-y-6">
                <RouterLink to="/" className="block text-xl font-bold dark:text-white">Home</RouterLink>
                <RouterLink to="/about" className="block text-xl font-bold dark:text-white">About</RouterLink>
                <RouterLink to="/user/temples" className="block text-xl font-bold dark:text-white">Temples</RouterLink>
                <RouterLink to="/user/stm-club" className="block text-xl font-black text-indigo-600 italic">STM Club</RouterLink>
                
                <div className="pt-6 border-t dark:border-slate-800 space-y-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Divine Services</p>
                  {servicesLinks.map(link => (
                    <RouterLink key={link.name} to={link.href} className="block text-lg font-semibold dark:text-slate-300">
                      {link.name}
                    </RouterLink>
                  ))}
                </div>

                <div className="mt-auto pt-8 border-t dark:border-slate-800">
                  {user ? (
                    <button onClick={handleLogout} className="flex items-center gap-3 font-bold text-red-500 w-full text-left">
                      <FiLogOut /> Sign Out
                    </button>
                  ) : (
                    <RouterLink to="/user/login" className="block w-full bg-indigo-600 text-white text-center py-4 rounded-xl font-bold">
                      Login
                    </RouterLink>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

/**
 * Sub-component for Desktop Profile Menu
 */
function ProfileDropdown({ isOpen, onLogout }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 15 }}
          className="absolute right-0 mt-4 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-3 z-[1000]"
        >
          <RouterLink to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl dark:text-white transition-colors">
            <FiUser className="text-indigo-600" /> My Account
          </RouterLink>
          <RouterLink to="/user/rituals" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl dark:text-white transition-colors">
            <FiHeart className="text-pink-500" /> My Rituals
          </RouterLink>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors mt-2">
            <FiLogOut /> Sign Out
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}