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
        const res = await api.get("/user/membership-plans/active");
        if (res.data.success) {
          // 🎯 THE FIX: Added .data to dig into the pagination object
          setPlans(res.data.data?.data || []);
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

  // 🎯 THE FIX: Flawless Navigation with the "Return Ticket"
  const handleSTMClubClick = (e) => {
    e.preventDefault(); 
    
    // Instantly check for an active session to prevent UI lag
    const activeToken = localStorage.getItem("token");

    if (activeToken) {
      // User is logged in, send them straight to the club
      navigate("/user/stm-club");
    } else {
      // User is logged out, send to login but attach the Return Ticket
      navigate("/user/login", { state: { from: "/user/stm-club" } });
    }
  };

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
      <Element name="about-summary" className="py-32 px-6 bg-slate-50 dark:bg-slate-900/40 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left Column: Text & Features */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-10"
          >
            <div>
              <SectionHeading title="About Us" /> 
              <SectionDivider />
            </div>
            
            <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-300 font-light">
              <strong className="font-bold text-indigo-700 dark:text-amber-400">Sarvatirthamayi</strong> is more than a platform; it's a movement to reconnect the modern world with ancient spiritual heritage through transparent, secure digital connectivity.
            </p>

            {/* Upgraded Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["Temple Culture", "Digital Connectivity", "Heritage Security", "Vedic Authenticity"].map((item, i) => (
                <div 
                  key={i} 
                  className="group flex items-center gap-4 p-4 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 cursor-default"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-all duration-300">
                    <CheckCircle2 className="text-indigo-600 dark:text-amber-400" size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 tracking-wide">{item}</span>
                </div>
              ))}
            </div>

            {/* Upgraded CTA */}
            <div className="pt-2">
              <button 
                onClick={() => navigate('/about')}
                className="group flex items-center gap-3 font-black text-indigo-600 dark:text-amber-400 uppercase text-xs tracking-[0.2em] hover:text-indigo-800 dark:hover:text-amber-300 transition-colors"
              >
                Read Our Full Story 
                <ArrowRight 
                  size={18} 
                  className="group-hover:translate-x-2 transition-transform duration-300 ease-out" 
                />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Staggered Cards */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
             {/* Complex Ambient Glow */}
             <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-600/15 via-transparent to-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
             
             {/* Staggered Layout Container */}
             <div className="relative z-10 flex flex-col gap-6 sm:gap-8">
                <VisionCard 
                  icon={<Eye />} 
                  title="Our Vision" 
                  color="bg-indigo-600 text-white" 
                  desc="Fostering a world where every seeker has seamless access to spiritual guidance and divine connection." 
                />
                
                {/* The 'Stagger' - Offsets the second card on larger screens */}
                <div className="sm:ml-12 lg:ml-16">
                  <VisionCard 
                    icon={<Target />} 
                    title="Our Mission" 
                    color="bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white" 
                    border
                    desc="To preserve ancient temples and provide transparent, highly secure digital platforms for sacred rituals." 
                  />
                </div>
             </div>
          </motion.div>
        </div>
      </Element>

      {/* --- MEMBERSHIP (STM CLUB) SECTION --- */}
      <section className="py-32 px-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* Ambient Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center bg-[#0B0F19] rounded-[3rem] p-10 md:p-20 shadow-2xl relative overflow-hidden border border-white/10">
            
            {/* Animated Rotating Gradient Background */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[50%] -right-[20%] w-[800px] h-[800px] bg-gradient-to-b from-amber-500/10 via-indigo-500/5 to-transparent blur-[80px] rounded-full pointer-events-none" 
            />
            
            {/* Left Column: Premium Copy */}
            <div className="lg:col-span-6 space-y-8 relative z-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 backdrop-blur-md">
                <Crown className="text-amber-400" size={18} />
                <span className="text-amber-400 font-bold uppercase tracking-[0.2em] text-[10px]">Sovereign Access</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-serif font-bold leading-tight italic bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-amber-400 drop-shadow-sm">
                The STM Club
              </h2>
              
              <p className="text-slate-300 text-lg max-w-lg leading-relaxed font-light">
                Step into the sovereign inner circle. Gain priority access to annual visits, personalized pooja services, and exclusive digital vouchers reserved only for members.
              </p>
              
              <div className="pt-6">
                <button 
                  onClick={handleSTMClubClick} 
                  className="group relative inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-amber-500 to-amber-300 text-slate-900 font-black rounded-2xl uppercase text-xs tracking-widest overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_rgba(251,191,36,0.3)]"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
                  {user?.membership === "active" ? "My Membership Dashboard" : "Become a Member"}
                </button>
              </div>
            </div>

            {/* Right Column: Clean, Highly Visible Pricing Card */}
            <div className="lg:col-span-6 relative h-[450px] flex items-center justify-center">
              
              <AnimatePresence mode="wait">
                {plans.length > 0 ? (
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-sm p-12 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 text-center shadow-2xl relative overflow-hidden group z-10"
                  >
                    {/* The Holographic Shine (Slightly more subtle) */}
                    <motion.div
                      animate={{ x: ['-150%', '250%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                      className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 z-0 pointer-events-none"
                    />

                    <div className="relative z-10">
                      <h4 className="text-amber-400/90 font-black uppercase tracking-[0.3em] text-xs mb-4">
                        {plans[currentIndex]?.name}
                      </h4>
                      
                      {/* Highly Visible Price */}
                      <div className="text-7xl font-black text-white mb-8 font-serif tracking-tight drop-shadow-lg flex items-start justify-center">
                        <span className="text-3xl text-white/50 mt-2 mr-1">₹</span>
                        {plans[currentIndex]?.price?.toLocaleString()}
                      </div>
                      
                      {/* Highlighted 'Sacred Visits' Container */}
                      <div className="inline-flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-400/30 rounded-2xl text-amber-300 text-sm font-black uppercase tracking-[0.15em] mb-10 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                        <Gift size={18} className="text-amber-400" /> 
                        <span>{plans[currentIndex]?.visits} Sacred Visits</span>
                      </div>
                      
                      <button onClick={handleSTMClubClick} className="text-white/80 text-[11px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto border-b border-transparent hover:border-white pb-1">
                        View Plan Benefits <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-white/30 font-black uppercase tracking-widest animate-pulse z-10">Loading Sovereign Plans...</div>
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