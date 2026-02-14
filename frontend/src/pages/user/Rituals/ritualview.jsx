import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  MapPin, ArrowLeft, Shrub, ShieldCheck, 
  ExternalLink, Info, Calendar, Sparkles, 
  ArrowRight, ChevronRight 
} from "lucide-react"; 
import api from "../../../api/api";
import { getFullImageUrl } from "../../../utils/config";
import Navbar from "../../../components/Navbar";

export default function RitualView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ritual, setRitual] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/user/rituals/details/${id}`);
        if (res.data.success) {
          setRitual(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching ritual details:", err);
      } finally {
        setLoading(false);
      }
    };
    window.scrollTo(0, 0); 
    fetchDetails();
  }, [id]);

  /**
   * FIXED: Address Fetching Logic
   * Maps individual fields from your Temple Schema into a readable string.
   */
  const getFormattedAddress = () => {
    const t = ritual?.temple_id;
    if (!t) return "Location details being sanctified...";
    
    const parts = [
      t.address_line1,
      t.address_line2,
      t.landmark ? `Near ${t.landmark}` : null,
      t.city_name,
      t.state_name,
      t.pincode
    ];
    return parts.filter(Boolean).join(", ");
  };

  if (loading || !ritual) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium animate-pulse text-lg font-serif">Invoking Sacred Details...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FBFAFF] text-slate-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        
        {/* --- Header Navigation --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-medium w-fit"
          >
            <div className="p-2 rounded-full bg-white shadow-sm group-hover:bg-indigo-50 transition-colors border border-slate-100">
              <ArrowLeft size={20} />
            </div>
            <span>Back to Rituals</span>
          </button>
          
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 w-fit shadow-sm">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Verified Traditional Ritual</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20">
          
          {/* --- LEFT: Image Section (Sticky) --- */}
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="lg:sticky lg:top-28">
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white p-2 md:p-3 border border-slate-100 group">
                <img 
                  src={getFullImageUrl(ritual.image)} 
                  alt={ritual.name}
                  className="w-full aspect-[4/5] md:aspect-video lg:aspect-square object-cover rounded-[2rem] transform transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1604340083878-a3947d1775c5?q=80&w=1000'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
                
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center justify-between text-white shadow-lg">
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-indigo-300" />
                      <span className="text-sm font-medium">Daily Slots Available</span>
                    </div>
                    <Sparkles size={20} className="text-amber-300 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT: Content Section --- */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-8">
            <header>
              <h1 className="text-5xl md:text-6xl font-serif text-slate-900 leading-tight mb-4 italic capitalize">
                {ritual.name}
              </h1>
              <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Ritual Type: {ritual.type || "Traditional Vedic"}
              </div>
            </header>

            {/* Info Cards */}
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Shrub size={26} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Conducted At</p>
                    <h3 className="text-xl font-bold text-slate-800 leading-snug">{ritual.temple_id?.name || "Sacred Temple Site"}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <MapPin size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Temple Address</p>
                    <p className="text-slate-600 leading-relaxed font-medium mb-3">
                      {getFormattedAddress()}
                    </p>
                    <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFormattedAddress())}`, '_blank')}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 transition-all group"
                    >
                        Open in Google Maps 
                        <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Significance Section */}
            <div className="relative p-8 bg-white rounded-[2.5rem] border border-dashed border-slate-200 overflow-hidden shadow-inner">
              <div className="absolute -top-4 -right-4 text-slate-100 opacity-50">
                <Info size={120} />
              </div>
              <div className="relative">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-4 flex items-center gap-2">
                   <Info size={14} className="text-indigo-400" /> Divine Significance
                </h3>
                <p className="text-slate-600 leading-relaxed text-lg italic font-light">
                  "{ritual.description || "Performed with absolute Vedic precision to invoke divine protection and spiritual harmony for the devotee."}"
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6">
              <button 
                onClick={() => navigate(`/book-ritual/${ritual._id}`)}
                className="w-full bg-[#8E44AD] hover:bg-[#7D3C98] text-white py-6 rounded-3xl text-lg font-bold uppercase tracking-widest shadow-xl shadow-purple-100 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Book Ritual Now
                <ArrowRight size={22} />
              </button>
              <div className="mt-4 flex items-center justify-center gap-6 opacity-40 grayscale">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-4" />
                 <span className="text-[10px] font-black uppercase tracking-tighter">Secure Booking Gateway</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- Mobile Sticky Footer --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
         <button 
            onClick={() => navigate(`/book-ritual/${ritual._id}`)}
            className="w-full bg-[#8E44AD] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-100 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Book Now <ChevronRight size={20} />
          </button>
      </div>
      <div className="h-20 lg:hidden"></div>
    </div>
  );
}