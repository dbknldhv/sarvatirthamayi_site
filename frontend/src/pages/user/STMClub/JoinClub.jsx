import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { getFullImageUrl } from "../../../utils/config";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, Edit3, X, Loader2, Calendar, MapPin, CheckCircle2 
} from "lucide-react";

export default function JoinClub() {
  const { user, dark } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const selectedPlan = location.state?.selectedPlan;

  const [temples, setTemples] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({ 
    birthday: "", 
    importantDate: "", 
    favoriteTemples: [] 
  });

  // Requirement: exactly 5 temples and both dates required to finalize
  const isComplete = formData.favoriteTemples.length === 5 && formData.birthday && formData.importantDate;

  useEffect(() => {
    if (!selectedPlan) {
      toast.error("Please select a plan first.");
      navigate("/join-now");
      return;
    }

    const fetchTemples = async () => {
      try {
        const res = await api.get("/user/temples");
        if (res.data.success) setTemples(res.data.data);
      } catch (err) {
        toast.error("Failed to load sacred destinations.");
      }
    };
    fetchTemples();
  }, [selectedPlan, navigate]);

  const availableTemples = useMemo(() => {
    return temples.filter(t => !formData.favoriteTemples.includes(t.name));
  }, [temples, formData.favoriteTemples]);

  const handleTempleSelect = (e) => {
    if (isProcessing) return; // Lock adjustment during processing
    const val = e.target.value;
    if (!val) return;
    if (formData.favoriteTemples.length >= 5) {
      return toast.error("You have reached the 5-temple limit.");
    }
    setFormData(prev => ({ ...prev, favoriteTemples: [...prev.favoriteTemples, val] }));
  };

  const removeTemple = (name) => {
    if (isProcessing) return; // Lock adjustment during processing
    setFormData(prev => ({ 
      ...prev, 
      favoriteTemples: prev.favoriteTemples.filter(t => t !== name) 
    }));
  };

  const handlePayment = async () => {
    setIsProcessing(true); // Lock the UI
    try {
      const { data: orderRes } = await api.post("/user/card/create-order", {
        planId: selectedPlan._id 
      });
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Sarvatirthamayi Club",
        description: `Activation: ${selectedPlan.name}`,
        order_id: orderRes.data.id,
        handler: async (response) => {
          const verifyToast = toast.loading("Confirming your legacy...");
          try {
            const { data: verifyRes } = await api.post("/user/card/verify-payment", {
              ...response,
              ...formData,
              planId: selectedPlan._id 
            });

            if (verifyRes.success) {
              toast.success("Welcome to the Inner Circle!", { id: verifyToast });
              navigate("/membership-card", { state: { cardData: verifyRes.data } });
            }
          } catch (err) {
            toast.error("Payment verification failed", { id: verifyToast });
            setIsProcessing(false); // Unlock only if payment fails completely
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setIsProcessing(false) }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      setIsProcessing(false);
      toast.error("Gateway connection failed.");
    }
  };

  const cardClass = `rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${dark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl"}`;
  const inputClass = `w-full p-4 rounded-2xl border-2 outline-none transition-all ${dark ? "bg-slate-800 border-slate-700 text-white focus:border-purple-500" : "bg-slate-50 border-slate-200 focus:border-purple-400"}`;

  return (
    <div className={`min-h-screen pb-20 ${dark ? 'bg-[#0b0f1a] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Toaster position="top-center" />
      
      <div className={`relative pt-32 pb-48 px-6 text-center ${dark ? 'bg-[#0b0f1a]' : 'bg-purple-700'}`}>
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-2">Personalize Your Card</h1>
        <p className="text-white/70 uppercase tracking-widest text-xs font-bold">Selected Plan: {selectedPlan?.name}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            <div className={cardClass}>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Edit3 size={20} className="text-purple-500" /> Sacred Details
                </h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Selection</span>
                   <span className="text-xl font-black text-purple-600">{formData.favoriteTemples.length}/5</span>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Date of Birth</label>
                    <input disabled={isProcessing} type="date" className={inputClass} value={formData.birthday} onChange={(e) => setFormData({...formData, birthday: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Significant Anniversary</label>
                    <input disabled={isProcessing} type="date" className={inputClass} value={formData.importantDate} onChange={(e) => setFormData({...formData, importantDate: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400">Choose Your 5 Destinations</label>
                  <select disabled={isProcessing || formData.favoriteTemples.length >= 5} className={inputClass} onChange={handleTempleSelect} value="">
                    <option value="">{formData.favoriteTemples.length >= 5 ? "Selection Complete" : "Search destinations..."}</option>
                    {availableTemples.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <AnimatePresence mode="popLayout">
                      {formData.favoriteTemples.map((name) => {
                        const t = temples.find(item => item.name === name);
                        return (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={name} className="flex items-center justify-between p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                            <div className="flex items-center gap-3">
                              <img src={getFullImageUrl(t?.image)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                              <span className="text-xs font-black uppercase">{name}</span>
                            </div>
                            {!isProcessing && (
                              <button onClick={() => removeTemple(name)} className="text-slate-400 hover:text-red-500 p-2"><X size={18}/></button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className={`${cardClass} p-8 sticky top-28`}>
              <h4 className="text-lg font-bold mb-6">Membership Review</h4>
              <div className="space-y-4 mb-8 text-sm">
                <div className="flex justify-between text-slate-500"><span>Selected Plan</span><b className="text-slate-900 dark:text-white">{selectedPlan?.name}</b></div>
                <div className="flex justify-between text-slate-500"><span>Validity</span><b className="text-slate-900 dark:text-white">{selectedPlan?.duration} {selectedPlan?.duration_type === 1 ? 'Month' : 'Year'}(s)</b></div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-[10px] font-black text-purple-500 uppercase">Total Investment</p>
                   <p className="text-3xl font-black">₹{selectedPlan?.price}</p>
                </div>
              </div>
              <button 
                onClick={handlePayment} 
                disabled={!isComplete || isProcessing}
                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all ${isComplete ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : "Activate Membership"}
              </button>
              <p className="mt-4 text-[9px] text-center text-slate-400 uppercase font-bold tracking-widest">Temples cannot be modified once membership is activated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}