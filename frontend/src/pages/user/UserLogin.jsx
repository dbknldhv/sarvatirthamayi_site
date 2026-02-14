import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheckCircle, FiChevronLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from "lucide-react";

const UserLogin = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { login, user, loading: authLoading } = useAuth();

    // 🎯 FIX 1: Ensure 'from' defaults to root correctly
    const from = location.state?.from || "/";

    const [formData, setFormData] = useState({ 
        mobileNumber: location.state?.mobile || '', 
        password: '' 
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState(location.state?.message || "");

    useEffect(() => {
        if (location.state?.message) {
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // 🎯 FIX 2: Better redirect logic to prevent loops
    useEffect(() => {
        if (!authLoading && user) {
            // If user is already logged in, send them to where they came from or Home
            navigate(from, { replace: true });
        }
    }, [user, authLoading, navigate, from]);

    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(""), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const res = await login({ 
                mobile: formData.mobileNumber, 
                password: formData.password 
            });

            // login() in AuthContext should return the response
            if (res?.success) {
                navigate(from, { replace: true }); 
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Invalid mobile number or password";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-purple-600" size={40} />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-white lg:bg-[#fcfaff] selection:bg-purple-200">
            {/* Left Side Banner */}
            <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative overflow-hidden bg-purple-950">
                <img src="/assets/event-banner.png" alt="Temple" className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-transparent to-purple-900/40" />
                <div className="relative z-10 flex flex-col justify-end p-16 w-full">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h2 className="text-5xl font-serif text-white leading-tight mb-6">Experience the Divine <br /> in Every Moment.</h2>
                        <p className="text-purple-100/70 text-lg max-w-md">Connect with your spiritual roots and manage your memberships with ease.</p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side Form */}
            <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 relative bg-white">
                
                {/* 🎯 FIX 3: Improved "Back to Home" Navigation */}
                <div className="absolute top-6 left-6 sm:top-12 sm:left-12 z-20">
                     <Link 
                        to="/" 
                        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-purple-600 transition-all group"
                     >
                        <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                     </Link>
                </div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl sm:text-4xl font-serif text-slate-900 mb-3">Sign In</h1>
                        <p className="text-slate-500 font-medium">Welcome back! Please enter your details.</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {successMsg && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-3">
                                <FiCheckCircle className="text-green-500" /> {successMsg}
                            </motion.div>
                        )}
                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                            <div className="relative group">
                                <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                                <input 
                                    type="tel" 
                                    placeholder="Enter mobile number" 
                                    value={formData.mobileNumber} 
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-purple-500 outline-none font-medium text-slate-900 transition-all focus:bg-white focus:ring-4 focus:ring-purple-50" 
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10); // Limit to 10 digits
                                        setFormData({...formData, mobileNumber: val});
                                    }} 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                                <Link to="/forgot-password" size="sm" className="text-purple-600 text-xs font-bold hover:underline">Forgot?</Link>
                            </div>
                            <div className="relative group">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={formData.password}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-purple-500 outline-none font-medium text-slate-900 transition-all focus:bg-white focus:ring-4 focus:ring-purple-50" 
                                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                                    required 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full py-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Sign In</span> <FiArrowRight /></>}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 font-medium">New to our community? <Link to="/signup" className="ml-2 text-purple-600 font-bold hover:underline">Create an account</Link></p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default UserLogin;