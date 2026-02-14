import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, User, CheckCircle, Download, Calendar, Phone, 
  MessageSquare, ArrowRight, ShieldCheck, Crown, Lock, 
  Info, ChevronLeft, Home, MapPin, Sparkles, Gift
} from "lucide-react";

export default function RitualBookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, dark } = useAuth();

  const [ritual, setRitual] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    bookingDate: "",
    devoteeName: "",
    whatsappNumber: "",
    specialWish: ""
  });

  /**
   * 25% MEMBERSHIP DISCOUNT LOGIC
   * Checks if user is active (status 1) and has an active membership string.
   */
  const { finalPrice, isDiscounted, savings } = useMemo(() => {
    const basePrice = selectedPackage?.price || 0;
    const hasMembership = user?.status === 1 && user?.membership === "active";
    
    if (hasMembership && basePrice > 0) {
      const discountAmount = basePrice * 0.25; 
      return {
        finalPrice: (basePrice - discountAmount).toFixed(2),
        isDiscounted: true,
        savings: discountAmount.toFixed(2)
      };
    }
    return { finalPrice: basePrice.toFixed(2), isDiscounted: false, savings: 0 };
  }, [selectedPackage, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/user/login"); return; }

    const fetchRitual = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/user/rituals/details/${id}`);
        const ritualData = res.data?.data || res.data;
        setRitual(ritualData);
        
        if (ritualData.packages?.length > 0) {
          setSelectedPackage(ritualData.packages[0]);
        }

        setFormData(prev => ({
          ...prev,
          devoteeName: user.name || "",
          whatsappNumber: user.mobile_number || ""
        }));
      } catch (err) {
        toast.error("Ritual details not found");
      } finally {
        setLoading(false);
      }
    };
    fetchRitual();
  }, [id, authLoading, user, navigate]);

  const handlePayment = async () => {
    if (!formData.bookingDate || !selectedPackage) {
      return toast.error("Please select a date and package");
    }
    setSubmitting(true);
    
    try {
      // 1. Create Razorpay Order with the dynamic finalPrice (Discounted or Real)
      const res = await api.post("/user/rituals/create-order", {
        ritualId: id,
        packageId: selectedPackage._id,
        amount: finalPrice 
      });

      const orderData = res.data.data;

      // 2. Configure Razorpay Options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        order_id: orderData.id,
        name: "Sarvatirthamayi",
        description: `Ritual: ${ritual?.name} (${isDiscounted ? 'Member Rate' : 'Standard Rate'})`,
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/user/rituals/verify-booking", {
              ...response,
              bookingData: { 
                ...formData, 
                ritualId: id, 
                packageId: selectedPackage._id,
                templeId: ritual.temple_id?._id,
                amount: finalPrice 
              }
            });

            if (verifyRes.data.success) {
              toast.success("Ritual Booked Successfully!");
              navigate("/booking-success", { 
                state: { 
                  receiptUrl: verifyRes.data.data.receiptUrl,
                  bookingDetails: formData,
                  ritualName: ritual.name
                } 
              });
            }
          } catch (error) {
            toast.error("Payment verification failed.");
          }
        },
        prefill: { name: formData.devoteeName, contact: formData.whatsappNumber },
        theme: { color: "#8E44AD" },
        modal: { ondismiss: () => setSubmitting(false) }
      };

      new window.Razorpay(options).open();
    } catch (err) {
      toast.error("Payment Initiation Failed");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="animate-spin text-purple-600 mb-4" size={50} />
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 tracking-widest uppercase">Invoking Sacred Space...</h2>
    </div>
  );

  return (
    <div className={`min-h-screen pt-24 pb-12 transition-all duration-300 ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <Toaster position="top-right" />
      
      <main className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* STICKY SIDEBAR */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border dark:border-slate-800">
              <div className="h-64 relative">
                <img src={ritual?.image} alt={ritual?.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                  <ChevronLeft size={20}/>
                </button>
                <div className="absolute bottom-6 left-8 right-8 text-white">
                   <h2 className="text-3xl font-black mb-1">{ritual?.name}</h2>
                   <div className="flex items-center gap-2 opacity-80 text-sm">
                      <MapPin size={16} className="text-purple-400"/> {ritual?.temple_id?.name || "Sacred Site"}
                   </div>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Select Package</p>
                  {ritual?.packages?.map((pkg) => (
                    <div 
                      key={pkg._id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedPackage?._id === pkg._id ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/10 shadow-md' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <span className={`font-bold ${selectedPackage?._id === pkg._id ? 'text-purple-700 dark:text-purple-400' : 'text-slate-600'}`}>{pkg.name}</span>
                      <span className="font-black">₹{pkg.price}</span>
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] border border-purple-100 dark:border-purple-800/50">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black text-purple-600 tracking-widest">Total Payable</span>
                        <div className="text-right flex flex-col">
                          {isDiscounted && (
                            <span className="text-xs line-through text-slate-400">₹{selectedPackage?.price}</span>
                          )}
                          <span className="text-3xl font-black text-purple-700 dark:text-purple-400">₹{finalPrice}</span>
                        </div>
                    </div>
                    {isDiscounted && (
                      <div className="mt-2 pt-2 border-t border-purple-100 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <ShieldCheck size={12}/> Sovereign Member 25% Discount Applied
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* FORM SECTION */}
          <div className="lg:col-span-7">
            <motion.div 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 lg:p-12 shadow-2xl border dark:border-slate-800"
            >
              <div className="mb-10">
                <h3 className="text-3xl font-black mb-2 italic">Ritual Sankalpa</h3>
                <p className="text-slate-400 text-sm font-medium">Please provide details for the ritual performance.</p>
              </div>

              <div className="space-y-8">
                {/* MEMBERSHIP PROMOTION CARD (Shown only if NOT a member) */}
                {!isDiscounted && (
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2rem] border border-amber-200 relative overflow-hidden group shadow-sm"
                  >
                    <div className="absolute -top-4 -right-4 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                      <Crown size={100} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-amber-800 font-black text-lg flex items-center gap-2 italic">
                          <Gift size={20} className="text-amber-500" /> Member Savings Available
                        </h4>
                        <p className="text-amber-700/70 text-sm font-medium mb-5">
                          Join the club to save <span className="text-amber-900 font-black">₹{(selectedPackage?.price * 0.25).toFixed(2)}</span> on this ritual.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={() => navigate("/user/stm-club")}
                            className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95"
                          >
                            Get Membership
                          </button>
                          <button 
                             onClick={() => toast("Standard rates applied", { icon: 'ℹ️' })}
                             className="text-amber-800/40 hover:text-amber-800 text-xs font-bold transition-colors"
                          >
                            No, I'll pay full price
                          </button>
                        </div>
                    </div>
                  </motion.div>
                )}

                <div className="relative group">
                  <label className="absolute left-14 -top-2.5 px-2 bg-white dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-purple-600 z-10 transition-colors">Ritual Date</label>
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split("T")[0]} 
                    className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-purple-500 rounded-2xl outline-none font-bold transition-all"
                    onChange={(e) => setFormData({...formData, bookingDate: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={20}/>
                    <input 
                      placeholder="Devotee Name"
                      value={formData.devoteeName}
                      className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-bold transition-all"
                      onChange={(e) => setFormData({...formData, devoteeName: e.target.value})}
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={20}/>
                    <input 
                      placeholder="WhatsApp Number"
                      value={formData.whatsappNumber}
                      className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-bold transition-all"
                      onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="relative group">
                  <MessageSquare className="absolute left-5 top-6 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={20}/>
                  <textarea 
                    placeholder="Gotra, Rashi, or Special Sankalpa Wish..."
                    className="w-full py-5 pl-14 pr-4 h-36 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-medium resize-none shadow-inner transition-all"
                    onChange={(e) => setFormData({...formData, specialWish: e.target.value})}
                  />
                </div>

                {/* FINAL BUTTON REFLECTING DYNAMIC AMOUNT */}
                <button 
                  onClick={handlePayment}
                  disabled={submitting}
                  className="group w-full bg-purple-600 text-white h-20 rounded-[2.5rem] font-black text-xl shadow-xl hover:bg-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 relative overflow-hidden"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={28} />
                  ) : (
                    <>
                      <Lock size={20} className="text-purple-300"/>
                      <span>Pay ₹{finalPrice} & Confirm</span>
                      <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform"/>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 pt-4 grayscale opacity-50">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" className="h-4" alt="Razorpay"/>
                   <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">Secured with 256-bit SSL encryption</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}