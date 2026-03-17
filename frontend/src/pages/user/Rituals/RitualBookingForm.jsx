import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, User, CheckCircle, Calendar, Phone, 
  MessageSquare, ArrowRight, ShieldCheck, Crown, Lock, 
  ChevronLeft, MapPin, Gift, Ticket, X, Sparkles, Info
} from "lucide-react";

export default function RitualBookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, dark } = useAuth();

  const [ritual, setRitual] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Voucher Discovery & Logic States
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  const [formData, setFormData] = useState({
    bookingDate: "",
    devoteeName: "",
    whatsappNumber: "",
    specialWish: ""
  });

  // AUTHORIZATION CHECK
  const isAuthorizedMember = useMemo(() => {
    return Number(user?.status) === 1 && user?.membership === "active";
  }, [user]);

  /**
   * --- DYNAMIC PRICE CALCULATION ---
   * Hierarchy: Membership Discount (25%) -> Then apply Voucher Discount
   */
  const { finalPrice, membershipSavings, voucherSavings } = useMemo(() => {
    const basePrice = selectedPackage?.price || 0;
    let currentPrice = basePrice;
    let memDisc = 0;
    let vDisc = 0;

    // 1. Apply Membership Discount (25% for Rituals)
    if (isAuthorizedMember && basePrice > 0) {
      memDisc = basePrice * 0.25;
      currentPrice -= memDisc;
    }

    // 2. Apply Voucher Discount
    if (appliedVoucher) {
      vDisc = appliedVoucher.discountAmount;
      currentPrice = Math.max(0, currentPrice - vDisc);
    }

    return { 
      finalPrice: currentPrice.toFixed(2), 
      membershipSavings: memDisc.toFixed(2),
      voucherSavings: vDisc.toFixed(2)
    };
  }, [selectedPackage, isAuthorizedMember, appliedVoucher]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/user/login"); return; }

    const fetchRitual = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/user/rituals/details/${id}`);
        const ritualData = res.data?.data || res.data;
        setRitual(ritualData);
        
        if (ritualData.packages?.length > 0) setSelectedPackage(ritualData.packages[0]);

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

  // VOUCHER DISCOVERY LOGIC
  const openCouponDiscovery = async () => {
    try {
      const res = await api.get("/user/vouchers/available?type=ritual");
      setAvailableCoupons(res.data.data || []);
      setShowCouponModal(true);
    } catch (err) {
      toast.error("Could not fetch offers.");
    }
  };

  const handleApplyVoucher = async (codeToApply = null) => {
    const targetCode = codeToApply || voucherCode;
    if (!targetCode.trim()) return toast.error("Enter a code first");
    
    setIsVerifyingVoucher(true);
    try {
      // Pass the price after membership for verification
      const midPrice = isAuthorizedMember ? (selectedPackage.price * 0.75) : selectedPackage.price;
      
      const res = await api.post("/user/vouchers/verify", {
        code: targetCode,
        amount: midPrice,
        serviceType: "ritual"
      });

      setAppliedVoucher({
        code: targetCode.toUpperCase(),
        discountAmount: res.data.data.discountAmount,
        voucherId: res.data.data.voucherId
      });
      setVoucherCode(targetCode.toUpperCase());
      setShowCouponModal(false);
      toast.success("Divine Offer Applied!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid Voucher Code");
      setAppliedVoucher(null);
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handlePayment = async () => {
    if (!formData.bookingDate) return toast.error("Please select a ritual date");
    if (!formData.devoteeName.trim()) return toast.error("Devotee name is required");
    if (!formData.whatsappNumber.match(/^[0-9]{10}$/)) return toast.error("Enter a valid 10-digit number");
    
    setSubmitting(true);
    try {
      const res = await api.post("/user/rituals/create-order", {
        ritualId: id,
        packageId: selectedPackage._id,
        voucherCode: appliedVoucher?.code
      });

      const orderData = res.data.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        order_id: orderData.id,
        name: "Sarvatirthamayi",
        description: `Sacred Ritual: ${ritual?.name}`,
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/user/rituals/verify-booking", {
              ...response,
              bookingData: { 
                ...formData, 
                ritualId: id, 
                packageId: selectedPackage._id,
                templeId: ritual.temple_id?._id,
                voucherCode: appliedVoucher?.code 
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
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 tracking-widest uppercase italic">Invoking Sacred Space...</h2>
    </div>
  );

  return (
    <div className={`min-h-screen pt-24 pb-12 transition-all duration-300 ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <Toaster position="top-right" />
      <main className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* SIDEBAR: Ritual Info & Price Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border dark:border-slate-800">
              <div className="h-64 relative">
                <img src={ritual?.image} alt={ritual?.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"><ChevronLeft size={20}/></button>
                <div className="absolute bottom-6 left-8 right-8 text-white">
                   <h2 className="text-3xl font-black mb-1 italic leading-tight">{ritual?.name}</h2>
                   <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-widest"><MapPin size={16} className="text-purple-400"/> {ritual?.temple_id?.name || "Sacred Site"}</div>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] px-2">Select Ritual Package</p>
                  {ritual?.packages?.map((pkg) => (
                    <div 
                      key={pkg._id}
                      onClick={() => { setSelectedPackage(pkg); setAppliedVoucher(null); }}
                      className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex justify-between items-center ${selectedPackage?._id === pkg._id ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/10 shadow-lg' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <span className={`font-bold ${selectedPackage?._id === pkg._id ? 'text-purple-700 dark:text-purple-400' : 'text-slate-600'}`}>{pkg.name}</span>
                      <span className="font-black text-lg">₹{pkg.price}</span>
                    </div>
                  ))}
                </div>

                {/* DYNAMIC PRICE SUMMARY */}
                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-[2.5rem] border border-purple-100 dark:border-purple-800/50">
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider"><span>Package Price</span><span>₹{selectedPackage?.price}</span></div>
                        {isAuthorizedMember && (
                            <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase">
                                <span className="flex items-center gap-1.5"><ShieldCheck size={12}/> Membership Discount (25%)</span>
                                <span>-₹{membershipSavings}</span>
                            </div>
                        )}
                        {appliedVoucher && (
                            <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase animate-in slide-in-from-right-2">
                                <span className="flex items-center gap-1.5"><Ticket size={12}/> Divine Coupon</span>
                                <span>-₹{voucherSavings}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-purple-200 dark:border-purple-800">
                        <span className="text-[10px] uppercase font-black text-purple-600 tracking-[0.2em]">Total Payable</span>
                        <span className="text-4xl font-black text-purple-700 dark:text-purple-400">₹{finalPrice}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM SECTION */}
          <div className="lg:col-span-7 space-y-6">
            {/* MEMBER BADGE / UPSELL */}
            <div className="mb-2">
              {isAuthorizedMember ? (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-8 py-5 rounded-[2.5rem] border border-emerald-500/20 shadow-sm relative overflow-hidden">
                  <Sparkles size={40} className="absolute -right-2 top-0 opacity-20 rotate-12" />
                  <Crown size={28} className="fill-current" />
                  <div><p className="text-xs font-black uppercase tracking-widest leading-none">Authorized Sovereign Member</p><p className="text-[10px] font-medium opacity-80 mt-1.5 uppercase">Exclusive 25% ritual savings are applied.</p></div>
                </motion.div>
              ) : (
                <motion.div whileHover={{ y: -2 }} className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-[2.5rem] border border-amber-500/20 relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="max-w-[70%]">
                      <h4 className="text-amber-700 dark:text-amber-400 font-black text-sm flex items-center gap-2 uppercase tracking-tighter"><Gift size={18} /> Unlock Member Savings</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mt-1 uppercase tracking-tight">Authorized members save <span className="font-bold">25% on every ritual package</span> instantly.</p>
                    </div>
                    <button onClick={() => navigate("/user/stm-club")} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all shrink-0">Join STM Club</button>
                  </div>
                  <Crown size={80} className="absolute -bottom-4 -right-4 text-amber-500/10 group-hover:rotate-12 transition-transform" />
                </motion.div>
              )}
            </div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 lg:p-14 shadow-2xl border dark:border-slate-800">
              <h3 className="text-3xl font-black mb-10 italic tracking-tight">Ritual Sankalpa</h3>
              <div className="space-y-8">
                {/* VOUCHER DISCOVERY UI */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3"><Ticket className="text-indigo-600" size={18}/><h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Apply Promo Code</h4></div>
                    <button onClick={openCouponDiscovery} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-tighter flex items-center gap-1"><Sparkles size={12}/> View Offers</button>
                  </div>
                  {appliedVoucher ? (
                    <div className="flex items-center justify-between bg-indigo-600 text-white p-5 rounded-3xl shadow-xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-3"><CheckCircle size={22}/><p className="font-black text-xl tracking-[0.3em] ml-2">{appliedVoucher.code}</p></div>
                      <button onClick={() => setAppliedVoucher(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <input type="text" placeholder="ENTER CODE" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} className="flex-1 h-14 px-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold focus:border-indigo-500 transition-all uppercase text-sm tracking-widest"/>
                      <button onClick={() => handleApplyVoucher()} disabled={isVerifyingVoucher || !voucherCode} className="px-10 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all text-xs uppercase tracking-widest">{isVerifyingVoucher ? <Loader2 className="animate-spin" size={16}/> : "Apply"}</button>
                    </div>
                  )}
                </div>

                <div className="relative group"><label className="absolute left-14 -top-2.5 px-2 bg-white dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-purple-600 z-10">Ritual Date</label><Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input type="date" min={new Date().toISOString().split("T")[0]} className="w-full h-16 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-purple-500 rounded-2xl outline-none font-bold transition-all" onChange={(e) => setFormData({...formData, bookingDate: e.target.value})}/></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative"><User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input placeholder="Devotee Name" value={formData.devoteeName} className="w-full h-16 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:border-purple-500 border-2 border-transparent transition-all shadow-inner" onChange={(e) => setFormData({...formData, devoteeName: e.target.value})}/></div>
                  <div className="relative"><Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input placeholder="WhatsApp Number" value={formData.whatsappNumber} className="w-full h-16 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:border-purple-500 border-2 border-transparent transition-all shadow-inner" onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}/></div>
                </div>

                <div className="relative"><MessageSquare className="absolute left-6 top-7 text-slate-400" size={20}/><textarea placeholder="Gotra, Rashi, or Special Sankalpa Wishes..." className="w-full py-6 pl-16 pr-4 h-40 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-medium resize-none shadow-inner border-2 border-transparent focus:border-purple-500 transition-all" onChange={(e) => setFormData({...formData, specialWish: e.target.value})}/></div>

                <button onClick={handlePayment} disabled={submitting} className="group w-full bg-purple-600 text-white h-24 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-5 disabled:opacity-50 relative overflow-hidden">
                  {submitting ? <Loader2 className="animate-spin" size={32} /> : (<><Lock size={24} className="text-purple-300"/><span>Pay ₹{finalPrice} & Confirm</span><ArrowRight size={28} className="group-hover:translate-x-2 transition-transform"/></>)}
                </button>
                <div className="flex items-center justify-center gap-4 pt-2 opacity-50"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" className="h-4" alt="Razorpay"/><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Secured Gateway Connection</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* OFFER DISCOVERY MODAL */}
      <AnimatePresence>
        {showCouponModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl border dark:border-slate-800 relative overflow-hidden">
              <Sparkles className="absolute -top-6 -left-6 text-indigo-500/10 w-32 h-32" />
              <div className="flex justify-between items-center mb-8 relative z-10"><h3 className="text-2xl font-black italic tracking-tighter">Ritual Offers</h3><button onClick={() => setShowCouponModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24}/></button></div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 relative z-10">
                {availableCoupons.length > 0 ? availableCoupons.map((cpn) => (
                  <motion.div key={cpn._id} whileHover={{ x: 5 }} onClick={() => handleApplyVoucher(cpn.code)} className="p-6 border-2 border-indigo-50 dark:border-indigo-900/30 rounded-[2.5rem] cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group">
                    <div className="flex justify-between items-start mb-2"><span className="font-mono font-black text-indigo-600 text-xl tracking-[0.2em]">{cpn.code}</span><span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full uppercase tracking-tighter">{cpn.discount_type === 'percentage' ? `${cpn.discount_value}% OFF` : `₹${cpn.discount_value} OFF`}</span></div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{cpn.description || "Divine savings for your sacred ritual."}</p>
                  </motion.div>
                )) : (
                  <div className="text-center py-10 opacity-50"><Ticket size={40} className="mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">No Ritual Offers Today</p></div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}