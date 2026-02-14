import React, { useRef, useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Download, CheckCircle2, Home, Star, Loader2, Calendar, Fingerprint, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import api from "../../../api/api";
import { getFullImageUrl } from "../../../utils/config";
import { toast, Toaster } from "react-hot-toast";

export default function MembershipSuccess() {
  const { user, dark } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);
  const [cardData, setCardData] = useState(location.state?.cardData || null);
  const [loading, setLoading] = useState(!location.state?.cardData);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!cardData) {
      api.get("/user/card/my-card")
        .then(res => {
          if (res.data.success) setCardData(res.data.data);
          else navigate("/join-now");
        })
        .catch(() => navigate("/join-now"))
        .finally(() => setLoading(false));
    }
  }, [cardData, navigate]);

  // Expiration Logic
  const expiryDate = user?.membershipExpiresAt ? new Date(user.membershipExpiresAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : "N/A";

  const downloadCard = async () => {
    setIsDownloading(true);
    const downloadToast = toast.loading("Minting your digital legacy...");
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, { 
        scale: 4,
        backgroundColor: null,
        useCORS: true,
      }); 
      
      const data = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = data;
      link.download = `STM-Card-${user?.name?.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.click();
      toast.success("Sacred Card saved!", { id: downloadToast });
    } catch (err) {
      toast.error("Download failed.", { id: downloadToast });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <Loader2 className="animate-spin text-purple-500" size={40} />
    </div>
  );

  return (
    <div className={`min-h-screen pt-24 pb-20 flex flex-col items-center px-4 transition-colors duration-500 ${dark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Toaster position="top-center" />
      
      <div className="text-center mb-10">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={40} className="text-green-500" />
        </motion.div>
        <h1 className="text-3xl font-serif font-bold">The Circle is Complete</h1>
        <p className="text-slate-500 text-sm mt-2">Your sacred digital identity is ready.</p>
      </div>

      {/* --- PREMIUM CARD DESIGN START --- */}
      <div ref={cardRef} className="w-full max-w-md aspect-[1.58/1] relative rounded-[2.5rem] overflow-hidden shadow-2xl p-[1.5px] bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-800">
        <div className="bg-[#0f172a] h-full w-full rounded-[2.4rem] p-8 flex flex-col justify-between text-white relative overflow-hidden">
          
          {/* Background Aura */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl" />

          {/* Header */}
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.ico" 
                className="w-10 h-10 rounded-lg" 
                alt="Logo" 
                crossOrigin="anonymous" 
              />
              <div>
                <h4 className="text-[10px] font-black tracking-[0.2em] uppercase">Sarvatirthamayi</h4>
                <p className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">Premium Legacy</p>
              </div>
            </div>
            <Star size={20} className="text-amber-400" fill="currentColor" />
          </div>

          {/* Body */}
          <div className="relative z-10 mt-4">
            <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1 flex items-center gap-1">
              <Fingerprint size={10} /> Member
            </p>
            <h3 className="text-2xl font-serif font-bold tracking-tight">{user?.name}</h3>
          </div>

          {/* Stats Row */}
          {/* <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
              <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">Total Visits</p>
              <p className="text-base font-black text-purple-400">
                {cardData?.planDetails?.visits || "---"} <span className="text-[8px] text-white/50 uppercase">Sites</span>
              </p>
            </div>
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
              <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">Valid Until</p>
              <p className="text-[11px] font-bold flex items-center gap-1">
                <Clock size={12} className="text-purple-500" /> {expiryDate}
              </p>
            </div>
          </div>{/* 

          {/* Footer */}
          <div className="flex justify-between items-end relative z-10 pt-4 border-t border-white/5">
            <div>
              <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1">Membership ID</p>
              <p className="font-mono text-slate-300 text-[10px] tracking-tighter uppercase">
                {cardData?._id ? `STM-${cardData._id.slice(-8).toUpperCase()}` : "STM-PROCESSING"}
              </p>
            </div>
            
            {/* Sacred Places Grid */}
            <div className="flex -space-x-2">
              {cardData?.templeDetails?.slice(0, 4).map((temple, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0f172a] overflow-hidden bg-slate-800 shadow-lg">
                  <img 
                    src={getFullImageUrl(temple.image)} 
                    className="w-full h-full object-cover" 
                    alt="temple"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
              {cardData?.templeDetails?.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-[#0f172a] bg-purple-600 flex items-center justify-center text-[8px] font-bold">
                  +{cardData.templeDetails.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* --- PREMIUM CARD DESIGN END --- */}

      <div className="mt-12 flex flex-col gap-4 w-full max-w-md">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadCard} 
          disabled={isDownloading} 
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl"
        >
          {isDownloading ? <Loader2 className="animate-spin" /> : <Download size={18} />} Download ID Card
        </motion.button>
        
        <button 
          onClick={() => navigate("/")} 
          className="w-full py-5 rounded-2xl font-black uppercase text-[10px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          <Home size={16} /> Back to Home
        </button>
      </div>
    </div>
  );
}