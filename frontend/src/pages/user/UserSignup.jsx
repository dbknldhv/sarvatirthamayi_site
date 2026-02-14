import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiPhone, FiMail, FiLock, FiCheckCircle, FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiChevronLeft } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function UserSignup() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    email: "",
    mobile_number: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  // OTP Timer Logic
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (formData.password.length < 6) return setError("Password must be at least 6 characters.");
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match!");

    setLoading(true);
    try {
      const { data } = await api.post("/user/signup", {
        first_name: formData.first_name,
        email: formData.email,
        mobile_number: formData.mobile_number,
        password: formData.password
      });

      if (data.success) {
        setStep(2);
        setTimer(30);
        setCanResend(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (formData.otp.length !== 6) return setError("Enter the 6-digit verification code.");
    
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/user/verify-otp", {
        mobile_number: formData.mobile_number,
        otp: formData.otp
      });

      if (data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          // 🎯 Path corrected to match App.jsx route
          navigate("/user/login", { 
            state: { mobile: formData.mobile_number, message: "Verification successful! Please log in." },
            replace: true 
          });
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-purple-600" size={40} />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white lg:bg-[#fcfaff] selection:bg-purple-200">
      
      {/* 🏛️ Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[45%] relative bg-purple-950 overflow-hidden">
        <img src="/assets/event-banner.png" alt="Temple" className="absolute inset-0 w-full h-full object-cover opacity-30 scale-105" />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-900/40 to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-lg shadow-purple-500/20">
              <img src="/assets/favicon.ico" alt="Logo" className="w-8 h-8" />
            </div>
            <span className="font-serif text-2xl tracking-wide font-bold">STM Club</span>
          </div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-4xl xl:text-5xl font-serif leading-tight mb-6">Start Your <br /> Spiritual Journey.</h2>
            <p className="text-purple-100/70 text-lg max-w-sm">Join our sacred community and experience divine connectivity with ease.</p>
          </motion.div>
          
          <p className="text-sm text-purple-300/50 italic">© 2026 STM Club Portal</p>
        </div>
      </div>

      {/* 📝 Right Side - Form Section */}
      <div className="w-full lg:w-[60%] xl:w-[55%] flex flex-col justify-center items-center p-6 sm:p-12 relative bg-white">
        
        {/* Back Home Button */}
        <div className="absolute top-8 left-8 z-20">
             <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-purple-600 transition-all group">
                <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                Back to Home
             </Link>
        </div>

        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">
                  <FiCheckCircle size={60} />
                </div>
                <h2 className="text-3xl font-serif text-slate-900 mb-2">Account Verified!</h2>
                <p className="text-slate-500">Redirecting you to the login screen...</p>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="signup" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 mb-2">Create Account</h2>
                  <p className="text-slate-500 font-medium">Please fill in your details to join the community.</p>
                </div>
                
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
                        className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> {error}
                    </motion.div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="relative group">
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                    <input type="text" placeholder="First Name" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition-all" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                  </div>
                  
                  <div className="relative group">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                    <input type="email" placeholder="Email Address" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>

                  <div className="relative group">
                    <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                    <input type="tel" placeholder="Mobile Number" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition-all" value={formData.mobile_number} onChange={(e) => setFormData({...formData, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10)})} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative group">
                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                        <input type={showPassword ? "text" : "password"} placeholder="Password" required className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition-all" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div className="relative group">
                        <input type={showPassword ? "text" : "password"} placeholder="Confirm" required className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition-all" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                             {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-4 bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-100 flex items-center justify-center gap-2 hover:bg-purple-800 transition-all active:scale-[0.98] disabled:opacity-70">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <>Continue <FiArrowRight /></>}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="text-center">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><FiMail size={40} /></div>
                  <h2 className="text-3xl font-serif text-slate-900 mb-2">Verify Mobile</h2>
                  <p className="text-slate-500">We've sent a 6-digit code to <br /><span className="text-purple-600 font-bold">{formData.mobile_number}</span></p>
                </div>

                {error && <div className="mb-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <input 
                    type="text" 
                    maxLength="6" 
                    placeholder="0 0 0 0 0 0" 
                    className="w-full text-center text-4xl tracking-[0.5rem] font-bold py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl outline-none focus:border-purple-500 focus:border-solid focus:bg-white transition-all" 
                    value={formData.otp}
                    onChange={(e) => setFormData({...formData, otp: e.target.value.replace(/[^0-9]/g, '')})} 
                    required 
                  />
                  
                  <button disabled={loading} className="w-full py-4 bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-800 transition-all active:scale-[0.98]">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Verify & Register"}
                  </button>

                  <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                      Didn't receive the code? <br />
                      {canResend ? (
                        <button type="button" onClick={() => {/* Resend logic */}} className="text-purple-600 font-bold hover:underline mt-1">Resend Now</button>
                      ) : (
                        <span className="text-slate-400 font-medium">Resend available in <span className="text-purple-600">{timer}s</span></span>
                      )}
                    </p>
                    
                    <button type="button" onClick={() => setStep(1)} className="flex items-center justify-center gap-2 text-sm text-slate-400 mx-auto hover:text-purple-600 font-bold transition-colors">
                        <FiArrowLeft /> Edit Details
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 font-medium">Already a member? <Link to="/user/login" className="text-purple-600 font-bold hover:underline ml-1">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}