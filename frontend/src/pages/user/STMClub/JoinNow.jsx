import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import { 
  ChevronDown, MapPin, Search,
  ShieldCheck, ArrowRight, 
  Sparkles, XCircle, CreditCard, Calendar, AlertCircle, RefreshCcw
} from "lucide-react";

export default function JoinNow() {
  const navigate = useNavigate();
  const { authenticated, dark } = useAuth();
  
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [membership, setMembership] = useState(null);
  const [showTiers, setShowTiers] = useState(false); 
  
  const [temples, setTemples] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [templeLoading, setTempleLoading] = useState(false);

  const isExpired = membership?.end_date ? new Date(membership.end_date) < new Date() : false;
  const isMember = membership && !isExpired;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statesRes, plansRes, memRes] = await Promise.all([
          api.get("/user/states"),
          api.get("/user/membership-plans"),
          api.get("/user/my-membership").catch(() => ({ data: { success: false } }))
        ]);

        if (statesRes.data.success) setStates(statesRes.data.data || []);
        
        if (plansRes.data.success) {
          const fetchedPlans = plansRes.data.data || [];
          setPlans(fetchedPlans);
          if (fetchedPlans.length > 0) setSelectedPlan(fetchedPlans[0]);
        }
        
        if (memRes.data.success && memRes.data.data) {
          setMembership(memRes.data.data);
        }
      } catch (err) {
        console.error("Initialization Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // FIXED: Temple Search & Filter Logic
  useEffect(() => {
    const fetchTemples = async () => {
      setTempleLoading(true);
      try {
        const params = {};
        // Ensure these keys match what your Backend expects (e.g., 'state' or 'stateName')
        if (selectedState) params.state = selectedState; 
        if (searchTerm) params.search = searchTerm;

        const res = await api.get("/user/temples", { params });
        if (res.data.success) {
          setTemples(res.data.data || []);
        }
      } catch (err) {
        console.error("Fetch Temples Error:", err);
      } finally {
        setTempleLoading(false);
      }
    };

    const debounce = setTimeout(fetchTemples, 400);
    return () => clearTimeout(debounce);
  }, [selectedState, searchTerm]);

  const handleProceed = () => {
    if (!authenticated) {
      toast.error("Please login to continue");
      return setTimeout(() => navigate("/user/login"), 1500);
    }
    
    if (membership && !isExpired && !showTiers) {
      return navigate("/membership-card");
    }

    if (!selectedPlan) return toast.error("Please select a plan");

    navigate("/join-club/premium", { 
      state: { planId: selectedPlan._id, selectedPlan, isRenewal: isExpired } 
    });
  };

  // NEW: Handle Temple Click Redirection
  const handleTempleClick = (templeId) => {
    if (!authenticated) {
      toast.error("Please login to view details");
      return navigate("/user/login");
    }

    if (isMember) {
      // Redirect to booking if they are an active member
      navigate(`/book-temple/${templeId}`);
    } else {
      // Redirect to specific temple details/info if not a member
      navigate(`/temple/${templeId}`);
      toast("Join a plan to book a visit!", { icon: '✨' });
    }
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-500 ${dark ? 'bg-[#0a0a1a] text-slate-200' : 'bg-[#f8fafc] text-slate-900'}`}>
      <Toaster position="top-center" />
      
      {/* Hero Header */}
      <section className="pt-32 pb-16 text-center px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
          <Sparkles size={14} /> The Sarvatirthamayi Experience
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
          Elevate Your <span className="text-purple-600">Sacred</span> Presence
        </h1>
      </section>

      <main className="max-w-7xl mx-auto px-4">
        
        {/* MEMBERSHIP SECTION */}
        <section className="mb-24 flex flex-col items-center">
          {membership && !showTiers ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className={`relative w-full max-w-md p-8 rounded-[2.5rem] border-2 shadow-2xl transition-all overflow-hidden ${
                isExpired ? 'bg-red-500/5 border-red-500/30' : 'bg-gradient-to-br from-purple-900 to-slate-900 border-purple-500/30 text-white'
              }`}
            >
              <div className="absolute -right-12 -bottom-12 opacity-10 rotate-12">
                <CreditCard size={240} />
              </div>

              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black opacity-60">Current Status</p>
                  <h3 className={`text-2xl font-serif font-bold mt-1 ${isExpired ? 'text-red-500' : 'text-white'}`}>
                    {isExpired ? "Membership Expired" : membership.membership_name || "Active Member"}
                  </h3>
                </div>
                {isExpired ? <AlertCircle className="text-red-500" /> : <ShieldCheck className="text-purple-400" size={32} />}
              </div>

              <div className="space-y-5 mb-10 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white/5"><Calendar size={18} className="text-purple-400" /></div>
                  <div>
                    <p className="text-[10px] uppercase opacity-50">Valid Until</p>
                    <p className="text-sm font-bold">{new Date(membership.end_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white/5"><MapPin size={18} className="text-purple-400" /></div>
                  <div>
                    <p className="text-[10px] uppercase opacity-50">Visits Remaining</p>
                    <p className="text-sm font-bold">{membership.remaining_visits} Sacred Locations</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 relative z-10">
                <button onClick={handleProceed} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all ${isExpired ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'}`}>
                  {isExpired ? "Renew Now" : "Access Digital Pass"}
                  <ArrowRight size={16} />
                </button>
                <button onClick={() => setShowTiers(true)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <RefreshCcw size={12} className="inline mr-2" /> View Other Plans
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl text-center">
              <h2 className="text-2xl font-serif font-bold mb-8">
                {membership ? "Upgrade Your Tier" : "Select Your Tier"}
              </h2>
              <div className="relative mb-6">
                <select 
                  disabled={loading}
                  value={selectedPlan?._id || ""} 
                  onChange={(e) => setSelectedPlan(plans.find(p => p._id === e.target.value))}
                  className={`w-full appearance-none border-2 rounded-2xl px-6 py-5 font-bold outline-none ${dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 shadow-xl'}`}
                >
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{p.price} ({p.duration} {p.duration_type === 2 ? 'Years' : 'Months'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
              </div>
              <button onClick={handleProceed} className="w-full max-w-md py-6 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-2xl">
                {isExpired ? "Renew Membership" : "Secure Access"}
              </button>
              {membership && (
                <button onClick={() => setShowTiers(false)} className="mt-4 text-xs font-bold text-slate-500">Back to My Card</button>
              )}
            </motion.div>
          )}
        </section>

        {/* GALLERY FILTERS */}
        <section className="pb-20 border-t border-slate-800/50 pt-20">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-6">
            <h2 className="text-4xl font-serif font-bold flex items-center gap-3">
              <MapPin className="text-purple-600" /> Sacred Gallery
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:min-w-[300px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search temple or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                />
              </div>

              <div className="relative w-full sm:min-w-[200px]">
                <select 
                  value={selectedState} 
                  onChange={(e) => setSelectedState(e.target.value)} 
                  className={`w-full border-2 rounded-2xl px-6 py-4 appearance-none outline-none ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                  <option value="">All Regions</option>
                  {states.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* TEMPLE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <AnimatePresence mode="popLayout">
              {templeLoading ? (
                [1, 2, 3].map(i => <div key={i} className="h-80 bg-slate-800/30 rounded-[2.5rem] animate-pulse" />)
              ) : (
                temples.map((t) => (
                  <motion.div layout key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div 
                      onClick={() => handleTempleClick(t._id)}
                      className="h-80 rounded-[2.5rem] overflow-hidden relative group bg-slate-800 border border-white/5 shadow-xl cursor-pointer"
                    >
                      <img src={t.image || "/placeholder.jpg"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={t.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-white text-black w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                           {isMember ? "Book This Visit" : "View Details"} <ArrowRight size={14} />
                         </div>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <h4 className="font-bold text-lg">{t.name}</h4>
                      <p className="text-purple-500 text-[10px] uppercase tracking-widest font-black mt-1">{t.city_name}, {t.state_name}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}