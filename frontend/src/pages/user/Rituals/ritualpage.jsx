import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { getFullImageUrl } from "../../../utils/config"; 
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { motion } from "framer-motion";
import Navbar from "../../../components/Navbar";
import heroBg from "../../../assets/hero-bg.jpg";

// Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function RitualPage() {
  const navigate = useNavigate();
  const [temples, setTemples] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templeRes, ritualRes] = await Promise.all([
          api.get("/user/temples"),
          api.get("/user/rituals")
        ]);
        if (templeRes.data.success) setTemples(templeRes.data.data);
        if (ritualRes.data.success) setRituals(ritualRes.data.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="animate-pulse text-indigo-600 font-bold tracking-widest uppercase">
        Invoking Sacred Rituals...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            className="w-full h-full object-cover brightness-[0.4]" 
            alt="Sacred Rituals Backdrop" 
          />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center text-white px-6"
        >
          <h1 className="text-5xl md:text-7xl font-serif mb-6">Sacred Rituals</h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-200 font-light italic">
            "Direct your prayers through ancient Vedic traditions performed at consecrated energy centers."
          </p>
        </motion.div>
      </section>

      {/* --- TEMPLE CAROUSEL SECTION --- */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif dark:text-white">Participating Temples</h2>
            <div className="h-1 w-24 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
          </div>
          
          <Swiper
            modules={[Autoplay, Navigation, Pagination]}
            spaceBetween={30}
            slidesPerView={1}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            pagination={{ clickable: true, dynamicBullets: true }}
            navigation={true}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="pb-14 temple-swiper"
          >
            {temples.map((temple) => (
              <SwiperSlide key={temple._id}>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-xl group border border-slate-100 dark:border-slate-700"
                >
                  <div className="h-72 overflow-hidden relative">
                    <img 
                      src={getFullImageUrl(temple.image)} 
                      alt={temple.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-bold mb-1">
                        {temple.city_name || "Sacred Site"}
                      </p>
                      <h3 className="text-xl font-bold">{temple.name}</h3>
                    </div>
                  </div>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* --- RITUAL DETAILS GRID --- */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white italic">Divine Offerings</h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Select a ritual to view packages and book your slot.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {rituals.map((ritual) => (
              <motion.div 
                key={ritual._id}
                whileHover={{ y: -10 }}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 flex flex-col shadow-sm hover:shadow-2xl transition-all"
              >
                <div className="w-full h-56 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-6 overflow-hidden">
                  <img 
                    src={getFullImageUrl(ritual.image)} 
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform"
                    alt={ritual.name}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545641203-7d072a14e3b2?q=80&w=800'; }}
                  />
                </div>

                <div className="px-2">
                    <h3 className="text-2xl font-black dark:text-white mb-3">{ritual.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed line-clamp-2">
                    {ritual.description || "Consecrated Vedic ceremony conducted with traditional rites."}
                    </p>
                </div>

                {/* UPDATED BUTTON: Navigates to the Booking Form */}
                <button 
                  onClick={() => navigate(`/ritual-view/${ritual._id}`)}
                  className="mt-auto w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  Choose Package
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}