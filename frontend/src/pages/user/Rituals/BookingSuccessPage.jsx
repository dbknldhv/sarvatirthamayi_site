import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CheckCircle, Download, Home, Calendar, 
  User, Sparkles, ArrowRight, ShieldCheck 
} from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../../../components/Navbar";

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract data passed from the RitualBookingForm state
  const { receiptUrl, ritualName, bookingDetails } = location.state || {};

  // Security: Redirect if accessed directly without booking data
  useEffect(() => {
    if (!receiptUrl) {
      const timer = setTimeout(() => navigate("/user/rituals"), 3000);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [receiptUrl, navigate]);

  if (!receiptUrl) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Booking Found</h2>
        <p className="text-slate-500 mb-6">Redirecting you to sacred rituals...</p>
        <button onClick={() => navigate("/")} className="text-indigo-600 font-bold flex items-center gap-2">
           <Home size={18} /> Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFAFF] overflow-hidden relative">
      <Navbar />

      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100/50 blur-[100px] rounded-full -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/50 blur-[100px] rounded-full -ml-48 -mb-48" />

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-24 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 md:p-16 shadow-2xl border border-white"
        >
          {/* Success Icon Animation */}
          <div className="mb-8 relative inline-block">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative p-6 bg-emerald-100 text-emerald-500 rounded-full"
            >
              <CheckCircle size={80} strokeWidth={1.5} />
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full" 
              />
            </motion.div>
            <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-pulse" size={24} />
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-900 mb-4 italic leading-tight">
            Ritual Confirmed
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-[10px] mb-8">
            <ShieldCheck size={14} /> Sankalpa Registered Successfully
          </div>

          <p className="text-slate-500 text-lg mb-12 max-w-md mx-auto leading-relaxed">
            Pranams, your sacred ritual for <br />
            <span className="text-indigo-600 font-black text-2xl block mt-2">{ritualName}</span>
            has been successfully scheduled.
          </p>

          {/* Info Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 text-left">
            <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-tighter">Devotee Name</p>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm"><User size={16} className="text-indigo-500" /></div>
                    {bookingDetails?.devoteeName}
                </div>
            </div>
            <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-tighter">Selected Date</p>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <div className="p-2 bg-white rounded-lg shadow-sm"><Calendar size={16} className="text-indigo-500" /></div>
                    {bookingDetails?.bookingDate}
                </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open(receiptUrl, "_blank")}
              className="w-full bg-[#8E44AD] text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-purple-200 hover:bg-[#7D3C98] transition-all flex items-center justify-center gap-3"
            >
              <Download size={24} /> Download Receipt
            </motion.button>
            
            <button 
              onClick={() => navigate("/")}
              className="group w-full py-4 text-slate-400 font-bold hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <Home size={18} /> Return to Home 
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 opacity-50 flex items-center justify-center gap-4 grayscale">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">Transaction Verified Securely</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}