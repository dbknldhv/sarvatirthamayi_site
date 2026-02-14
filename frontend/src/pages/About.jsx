import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Compass, Shield, Globe, Landmark, Users, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import SectionHeading from "../components/SectionHeading";
import SectionDivider from "../components/SectionDivider";
import api from "../api/api";

// Import local assets
import heritageMain from "../assets/hero-bg.jpg"; 

/**
 * --- High-Performance Animated Counter ---
 * Animates numbers from 0 to the target value
 */
function Counter({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const numericValue = parseInt(value) || 0;
    const controls = animate(count, numericValue, { 
        duration: 2.5, 
        ease: [0.33, 1, 0.68, 1] 
    });
    return controls.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

export default function About() {
  const [data, setData] = useState({ stats: null, gallery: [] });
  const [loading, setLoading] = useState(true);

  // 1. Fetch Stats and Gallery Images from aboutController
  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const res = await api.get("/user/about-data");
        if (res.data.success) {
          setData({ stats: res.data.stats, gallery: res.data.gallery });
        }
      } catch (err) {
        console.error("Failed to load about data:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutData();
  }, []);

  const statConfig = [
    { label: "Temples Partnered", key: "temples", icon: <Landmark className="text-indigo-600 dark:text-amber-400" /> },
    { label: "Rituals Performed", key: "rituals", icon: <Shield className="text-indigo-600 dark:text-amber-400" /> },
    { label: "Countries Active", key: "countries", icon: <Globe className="text-indigo-600 dark:text-amber-400" /> },
    { label: "Devotees Worldwide", key: "devotees", icon: <Users className="text-indigo-600 dark:text-amber-400" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Syncing with the Divine</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden">
      <Navbar />
      
      {/* --- HERO / HEADER SECTION --- */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center"
          >
            {/* The Decorative Heading Sandwich */}
            <SectionHeading title="About Us" />
            <SectionDivider />
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Sarvatirthamayi was born from a simple yet profound vision: to ensure that distance 
            never stands between a devotee and their divine connection.
          </motion.p>
        </div>
      </section>

      {/* --- STATS GRID --- */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {data.stats && statConfig.map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] text-center border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <div className="mb-4 inline-flex p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50 transition-all">
                {stat.icon}
              </div>
              <div className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-1">
                <Counter value={data.stats[stat.key]} />+
              </div>
              <div className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- INFINITE GALLERY --- */}
      <section className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 text-center md:text-left">
          <div>
            <h3 className="text-indigo-600 dark:text-amber-400 font-black uppercase tracking-widest text-xs mb-2">Divine Heritage</h3>
            <h2 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Ancient Shrines & Rituals</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto md:mx-0">
            Connecting the modern seeker with eternal wisdom through technology.
          </p>
        </div>

        <div className="flex relative group">
          <motion.div 
            className="flex gap-4 md:gap-8 whitespace-nowrap px-4"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
          >
            {[...data.gallery, ...data.gallery].map((item, i) => (
              <div 
                key={i} 
                className="w-[280px] md:w-[420px] h-[200px] md:h-[280px] shrink-0 relative group rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white dark:border-slate-900"
              >
                <img 
                  src={item.url} 
                  alt={item.title} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 md:p-10">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-3 py-1 rounded-full w-fit ${item.type === 'Ritual' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    {item.type}
                  </span>
                  <p className="text-white text-lg md:text-xl font-bold truncate">{item.title}</p>
                  <p className="text-slate-300 text-xs md:text-sm truncate">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- MISSION & ARTISTIC VISUAL --- */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl md:text-5xl font-serif font-bold dark:text-white mb-8 leading-tight">
              Rooted in Tradition, <br />
              <span className="text-indigo-600 italic">Driven by Faith.</span>
            </h2>
            <div className="grid gap-6">
              <ValueItem icon={<Compass />} title="Sacred Preservation" desc="We collaborate with ancient trusts to maintain the spiritual integrity of heritage shrines." />
              <ValueItem icon={<Shield />} title="Vedic Authenticity" desc="Every ritual is performed by certified priests following strict lineage-based protocols." />
              <ValueItem icon={<Globe />} title="Global Connectivity" desc="Leveraging technology to bring the temple experience to devotees worldwide." />
            </div>
          </div>
          
          <div className="order-1 lg:order-2 relative group">
            <div className="absolute inset-0 bg-indigo-600 rounded-[3rem] md:rounded-[4rem] rotate-3 scale-95 opacity-10 group-hover:rotate-6 transition-transform duration-700" />
            <div className="relative z-10 overflow-hidden rounded-[3rem] md:rounded-[4rem] shadow-2xl border-8 border-white dark:border-slate-800">
                <img 
                  src={heritageMain} 
                  alt="Temple Heritage" 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 hidden md:block">
                  <p className="text-white text-sm font-medium italic">"Ensuring the eternal flame of Vedic culture never fades."</p>
                </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Reusable Value Item Component
 */
function ValueItem({ icon, title, desc }) {
  return (
    <div className="flex gap-5 group">
      <div className="w-14 h-14 bg-white dark:bg-slate-900 shadow-lg rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <h4 className="text-xl font-bold mb-1 dark:text-white flex items-center gap-2">
          {title} <CheckCircle2 className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
        </h4>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm md:text-base">
          {desc}
        </p>
      </div>
    </div>
  );
}