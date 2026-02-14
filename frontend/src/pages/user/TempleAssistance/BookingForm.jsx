import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, MapPin, User, Sparkles, CheckCircle, Download, 
  ChevronLeft, Home, Mail, ShieldCheck, Calendar, Phone, 
  MessageSquare, ArrowRight, Clock, Info, Crown, Lock
} from "lucide-react";

export default function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, dark } = useAuth();

  const [temple, setTemple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");

  const [formData, setFormData] = useState({
    visitDate: "",
    devoteeName: "",
    whatsappNumber: "",
    specialWish: ""
  });

  /**
   * MEMBERSHIP & DISCOUNT LOGIC
   * Checks if user is active (status === 1) and has an active membership.
   * Applies a 0.7% discount (Price * 0.993).
   */
  const { finalPrice, isDiscounted } = useMemo(() => {
    const basePrice = temple?.visit_price || 0;
    const hasMembership = user?.status === 1 && user?.membership === "active";
    
    if (hasMembership) {
      return {
        finalPrice: (basePrice * 0.993).toFixed(2),
        isDiscounted: true
      };
    }
    return { finalPrice: basePrice, isDiscounted: false };
  }, [temple, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/user/login"); return; }

    const loadData = async () => {
      try {
        setLoading(true);
        const tempRes = await api.get(`/user/temples/${id}`);
        const templeData = tempRes.data?.data || tempRes.data;
        setTemple(templeData);
        setFormData(prev => ({
          ...prev,
          devoteeName: user.name || "",
          whatsappNumber: user.mobile_number || ""
        }));
      } catch (err) {
        toast.error("Failed to load temple data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, authLoading, user, navigate]);

  const handleInitialPayment = async () => {
    if (!formData.visitDate) return toast.error("Please select a visit date");
    setSubmitting(true);

    try {
      const res = await api.post("/user/book-temple/create-order", { 
        templeId: id, 
        amount: finalPrice 
      });
      
      const orderData = res.data.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: "INR",
        name: "Sarvatirthamayi",
        description: `Booking: ${temple?.name}`,
        order_id: orderData.id,
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/user/book-temple/verify", {
              ...response,
              bookingData: { ...formData, templeId: id, amount: finalPrice }
            });

            if (verifyRes.data.success) {
              setTicketUrl(verifyRes.data.ticketUrl);
              setShowSuccessView(true);
              toast.success("Pranams! Booking successful.");
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (vErr) {
            toast.error("Verification error. Check your email.");
          } finally {
            setSubmitting(false);
          }
        },
        prefill: { name: formData.devoteeName, email: user.email },
        theme: { color: "#7c3aed" }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      toast.error("Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="animate-spin text-purple-600 mb-4" size={50} />
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Sanctifying Connection...</h2>
    </div>
  );

  return (
    /* PT-24 (Padding Top) solves the overlap with your global navbar. 
       Adjust this value if your navbar is taller/shorter.
    */
    <div className={`min-h-screen pt-24 pb-12 transition-all duration-300 ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <Toaster position="top-right" />
      
      <main className="max-w-6xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {showSuccessView ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl border dark:border-slate-800"
            >
              <div className="mb-6 relative inline-block">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
                <div className="relative p-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full">
                  <CheckCircle size={60} strokeWidth={2}/>
                </div>
              </div>
              <h2 className="text-3xl font-black mb-3 italic">Visit Confirmed!</h2>
              <p className="text-slate-500 mb-10 text-lg">Pranams, <span className="text-slate-900 dark:text-white font-bold">{formData.devoteeName}</span>. Your journey is set.</p>
              
              <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl hover:bg-purple-700 transition-all">
                  <Download size={24} /> Download E-Ticket
                </button>
                <button onClick={() => navigate("/")} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-300">
                  <Home size={18} /> Return Home
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* STICKY SIDEBAR (Column 1) */}
              <div className="lg:col-span-5 lg:sticky lg:top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border dark:border-slate-800">
                  <div className="h-64 relative">
                    <img src={temple?.image} alt={temple?.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
                    <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                      <ChevronLeft size={20}/>
                    </button>
                    <div className="absolute bottom-6 left-8 right-8 text-white">
                       <h2 className="text-3xl font-black mb-1">{temple?.name}</h2>
                       <div className="flex items-center gap-2 opacity-80 text-sm">
                          <MapPin size={16} className="text-purple-400"/> {temple?.city_name}
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] border border-purple-100 dark:border-purple-800/50">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] uppercase font-black text-purple-600 tracking-widest">Payable Amount</span>
                           <div className="text-right">
                              {isDiscounted && (
                                <span className="text-xs line-through text-slate-400 mr-2">₹{temple?.visit_price}</span>
                              )}
                              <span className="text-3xl font-black text-purple-700 dark:text-purple-400">₹{finalPrice}</span>
                           </div>
                        </div>
                        {isDiscounted && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                            <Crown size={12}/> Membership 0.7% Discount Applied
                          </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                           <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Hours</p>
                           <p className="text-xs font-bold">{temple?.open_time} - {temple?.close_time}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-2">
                           <ShieldCheck size={16} className="text-emerald-500"/>
                           <p className="text-xs font-bold text-emerald-600">Verified Site</p>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM SECTION (Column 2) */}
              <div className="lg:col-span-7">
                <motion.div 
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 lg:p-12 shadow-2xl border dark:border-slate-800"
                >
                  <div className="mb-10">
                    <h3 className="text-3xl font-black mb-2 italic">Devotee Enrollment</h3>
                    <p className="text-slate-400 text-sm font-medium">Please enter the details for the sacred visit.</p>
                  </div>

                  <div className="space-y-8">
                    {/* Visit Date */}
                    <div className="relative group">
                      <label className="absolute left-14 -top-2.5 px-2 bg-white dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-purple-600 z-10">Visit Date</label>
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                      <input 
                        type="date" 
                        min={new Date().toISOString().split("T")[0]} 
                        className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-purple-500 rounded-2xl outline-none font-bold"
                        onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        <input 
                          placeholder="Full Name"
                          value={formData.devoteeName}
                          className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold"
                          onChange={(e) => setFormData({...formData, devoteeName: e.target.value})}
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        <input 
                          placeholder="WhatsApp Number"
                          value={formData.whatsappNumber}
                          className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold"
                          onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <MessageSquare className="absolute left-5 top-6 text-slate-400" size={20}/>
                      <textarea 
                        placeholder="Your Special Wish or Prayer (Optional)..."
                        className="w-full py-5 pl-14 pr-4 h-36 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-medium resize-none shadow-inner"
                        onChange={(e) => setFormData({...formData, specialWish: e.target.value})}
                      />
                    </div>

                    <button 
                      onClick={handleInitialPayment}
                      disabled={submitting}
                      className="group w-full bg-purple-600 text-white h-20 rounded-[2.5rem] font-black text-xl shadow-xl hover:bg-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 relative overflow-hidden"
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={28} />
                      ) : (
                        <>
                          <Lock size={20} className="text-purple-300"/>
                          <span>Confirm & Pay Entry</span>
                          <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform"/>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4 pt-4 grayscale opacity-50">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" className="h-4" alt="Razorpay"/>
                       <span className="text-[10px] font-black uppercase">Secure Gateway</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}