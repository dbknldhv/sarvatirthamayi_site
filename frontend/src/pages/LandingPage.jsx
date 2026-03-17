import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Element } from "react-scroll";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

import { 
  ShieldCheck, ArrowRight, Eye, Target, 
  CreditCard, Sparkles, CheckCircle2, Crown, Gift 
} from "lucide-react";

import Navbar from "../components/Navbar";
import SectionHeading from "../components/SectionHeading";
import SectionDivider from "../components/SectionDivider";

import heroBg from "../assets/hero-bg.jpg";
import sankalpImg from "../assets/event-banner.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const { dark, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Fetch Plans from the NEW Public Endpoint
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Updated from /admin/... to /user/... to resolve 403 Forbidden
        const res = await api.get("/user/membership-plans/active");
        if (res.data.success) {
          setPlans(res.data.data);
        }
      } catch (err) {
        console.error("LandingPage: Failed to fetch plans", err);
      }
    };
    fetchPlans();
  }, []);

  // 2. Plan Carousel Auto-Timer
  useEffect(() => {
    if (plans.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % plans.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [plans]);

  const handleSTMClubClick = () => navigate("/user/stm-club");

  return (
    <div className={`transition-colors duration-700 overflow-x-hidden ${dark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      <Navbar />

      {/* --- HERO SECTION --- */}
      <Element name="home">
        <section className="relative h-screen flex items-center justify-center px-6 overflow-hidden">
          <motion.div 
            initial={{ scale: 1.1 }} 
            animate={{ scale: 1 }} 
            transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          <div className={`absolute inset-0 z-[1] ${dark ? 'bg-slate-950/80' : 'bg-black/40'} backdrop-blur-[1px]`} />

          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="relative z-10 max-w-4xl text-center"
          >
            <motion.span 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-400 text-xs font-bold uppercase tracking-widest"
            >
              Tradition Meets Technology
            </motion.span>
            <h1 className="text-6xl md:text-8xl font-serif font-bold leading-tight mb-8 text-white drop-shadow-2xl">
              Sarvatirthamayi
            </h1>
            <p className="text-xl md:text-2xl font-light mb-10 text-white/90 max-w-2xl mx-auto leading-relaxed">
              Bridging the gap between the divine and the devotee, 
              connecting rituals and spirituality worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button
                onClick={handleSTMClubClick}
                className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-600/50 hover:bg-indigo-500 hover:-translate-y-1 transition-all duration-300 uppercase text-xs tracking-[0.2em]"
              >
                Join STM Club
              </button>
              <Link
                to="/user/temples"
                className="px-12 py-5 bg-white/10 backdrop-blur-xl border border-white/30 text-white font-black rounded-2xl hover:bg-white hover:text-indigo-900 transition-all duration-300 uppercase text-xs tracking-[0.2em]"
              >
                Explore Temples
              </Link>
            </div>
          </motion.div>
        </section>
      </Element>

      {/* --- ABOUT SUMMARY SECTION --- */}
      <Element name="about-summary" className="py-32 px-6 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -40 }} 
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <SectionHeading title="About Us" /> 
            <SectionDivider />
            <div className="space-y-8 text-lg text-slate-600 dark:text-slate-400">
              <p className="leading-relaxed font-medium">
                Sarvatirthamayi is more than a platform; it's a movement to reconnect the modern world with ancient spiritual heritage through transparent digital connectivity.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["Temple Culture", "Digital Connectivity", "Heritage Security", "Vedic Authenticity"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-105">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate('/about')}
                className="group flex items-center gap-3 font-black text-indigo-600 dark:text-amber-400 uppercase text-xs tracking-widest hover:gap-5 transition-all"
              >
                Read Our Full Story <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>

          <div className="relative">
             <div className="absolute -inset-4 bg-indigo-600/5 blur-3xl rounded-full" />
             <div className="grid grid-cols-1 gap-8 relative z-10">
                <VisionCard icon={<Eye />} title="Our Vision" color="bg-indigo-600" 
                  desc="Fostering a world where every seeker has seamless access to spiritual guidance." />
                <VisionCard icon={<Target />} title="Our Mission" color="bg-white dark:bg-slate-800" border
                  desc="To preserve ancient temples and provide transparent digital platforms for rituals." />
             </div>
          </div>
        </div>
      </Element>

      {/* --- MEMBERSHIP (STM CLUB) SECTION --- */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-slate-900 dark:bg-indigo-950 rounded-[4rem] p-12 md:p-20 shadow-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
            
            <div className="lg:col-span-7 space-y-8">
              <div className="flex items-center gap-3">
                <Crown className="text-amber-400" size={24} />
                <span className="text-amber-400 font-black uppercase tracking-[0.3em] text-[10px]">Premium Access</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight italic">The STM Club</h2>
              <p className="text-indigo-100/60 text-lg max-w-lg leading-relaxed font-medium">
                Join the sovereign inner circle. Gain priority access to annual visits, personalized pooja services, and exclusive member-only vouchers.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button onClick={handleSTMClubClick} className="px-10 py-5 bg-white text-indigo-900 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-amber-400 transition-all shadow-xl">
                  {user?.membership === "active" ? "My Membership Dashboard" : "Become a Sovereign Member"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-[450px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {plans.length > 0 ? (
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, y: -20 }}
                    className="w-full max-w-sm p-12 rounded-[3rem] bg-white/5 backdrop-blur-3xl border border-white/10 text-center shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 blur-3xl rounded-full group-hover:bg-amber-400/20 transition-colors" />
                    <Sparkles className="text-amber-400 mx-auto mb-6" size={36} />
                    <h4 className="text-white/60 font-black uppercase tracking-[0.4em] text-[10px] mb-3">
                      {plans[currentIndex]?.name}
                    </h4>
                    <div className="text-6xl font-black text-white mb-6 font-serif italic tracking-tighter">
                      ₹{plans[currentIndex]?.price.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-black uppercase mb-10 tracking-[0.1em]">
                      <Gift size={14} /> {plans[currentIndex]?.visits} Sacred Visits Included
                    </div>
                    <div className="h-[1px] w-16 bg-white/20 mx-auto mb-10" />
                    <button onClick={handleSTMClubClick} className="text-white text-[10px] font-black uppercase tracking-[0.2em] border-b-2 border-amber-400/30 hover:border-amber-400 transition-all pb-2">
                      View Plan Benefits
                    </button>
                  </motion.div>
                ) : (
                  <div className="text-indigo-100/20 font-black uppercase tracking-widest animate-pulse">Loading Plans...</div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* --- DIVINE SERVICES --- */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <SectionHeading title="Divine Services" />
          <SectionDivider />
          
          <div className="mt-16 max-w-lg mx-auto group">
            <div className="relative rounded-[3.5rem] overflow-hidden shadow-2xl cursor-pointer">
              <img src={sankalpImg} alt="Sankalp" className="w-full h-[500px] object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90" />
              
              <div className="absolute bottom-12 left-12 right-12 text-left">
                <span className="bg-amber-500 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase mb-5 inline-block tracking-[0.2em]">Featured Service</span>
                <h3 className="text-4xl font-serif font-bold text-white mb-3 italic">Sankalp Pooja</h3>
                <p className="text-white/70 text-sm mb-8 leading-relaxed font-medium">Personalized rituals performed in your name at powerful energy centers across India with digital evidence.</p>
                <button onClick={() => navigate('/user/rituals')} className="flex items-center gap-3 text-amber-400 font-black uppercase text-[10px] tracking-[0.2em] group-hover:gap-5 transition-all">
                  Book Your Ritual <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components
function VisionCard({ icon, title, desc, color, border }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-12 rounded-[3rem] shadow-xl transition-all hover:shadow-2xl ${color} ${border ? 'border-2 border-indigo-100 dark:border-slate-800' : 'text-white'}`}
    >
      <div className={`${border ? 'text-indigo-600' : 'text-white'} mb-8`}>
        {React.cloneElement(icon, { size: 40 })}
      </div>
      <h3 className={`text-3xl font-bold mb-5 font-serif italic ${border ? 'text-slate-900 dark:text-white' : ''}`}>{title}</h3>
      <p className={`leading-relaxed text-sm font-medium ${border ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-100/80'}`}>{desc}</p>
    </motion.div>
  );
}