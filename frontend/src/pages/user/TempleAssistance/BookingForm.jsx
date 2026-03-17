import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../api/api";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, MapPin, User, CheckCircle, Download, 
  ChevronLeft, Home, ShieldCheck, Calendar, Phone, 
  MessageSquare, ArrowRight, Crown, Lock, Ticket, X, Gift, Info, Sparkles
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

  // Voucher Selection Logic
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  const [formData, setFormData] = useState({
    visitDate: "",
    devoteeName: "",
    whatsappNumber: "",
    specialWish: ""
  });

  // AUTHORIZATION CHECK
  const isAuthorizedMember = useMemo(() => {
    return user?.status === 1 && user?.membership === "active";
  }, [user]);

  /**
   * --- DYNAMIC PRICE & SAVINGS CALCULATION ---
   */
  const { finalPrice, membershipSavings, voucherSavings, totalSavings } = useMemo(() => {
    const basePrice = temple?.visit_price || 0;
    let currentPrice = basePrice;
    let memDisc = 0;
    let vDisc = 0;

    if (isAuthorizedMember) {
      memDisc = basePrice * 0.007; // 0.7% Membership discount
      currentPrice -= memDisc;
    }

    if (appliedVoucher) {
      vDisc = appliedVoucher.discountAmount;
      currentPrice = Math.max(0, currentPrice - vDisc);
    }

    return {
      finalPrice: Number(currentPrice.toFixed(2)),
      membershipSavings: Number(memDisc.toFixed(2)),
      voucherSavings: Number(vDisc.toFixed(2)),
      totalSavings: Number((memDisc + vDisc).toFixed(2))
    };
  }, [temple, isAuthorizedMember, appliedVoucher]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/user/login"); return; }

    const loadData = async () => {
      try {
        setLoading(true);
        const tempRes = await api.get(`/user/temples/${id}`);
        setTemple(tempRes.data?.data || tempRes.data);
        setFormData(prev => ({
          ...prev,
          devoteeName: user.name || "",
          whatsappNumber: user.mobile_number || ""
        }));
      } catch (err) {
        toast.error("Temple details not found.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, authLoading, user, navigate]);

  // VOUCHER DISCOVERY LOGIC
  const openCouponDiscovery = async () => {
    try {
      const res = await api.get("/user/vouchers/available?type=temple");
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
      const priceForVoucher = isAuthorizedMember ? temple.visit_price * 0.993 : temple.visit_price;
      const res = await api.post("/user/vouchers/verify", {
        code: targetCode,
        amount: priceForVoucher,
        serviceType: "temple"
      });
      setAppliedVoucher({
        code: targetCode.toUpperCase(),
        discountAmount: res.data.data.discountAmount
      });
      setVoucherCode(targetCode.toUpperCase());
      setShowCouponModal(false);
      toast.success("Divine Offer Applied!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Code invalid for this visit.");
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handleInitialPayment = async () => {
    if (!formData.visitDate) return toast.error("Please select a visit date");
    if (!formData.devoteeName.trim()) return toast.error("Devotee name is required");
    if (!formData.whatsappNumber.match(/^[0-9]{10}$/)) return toast.error("Enter a valid 10-digit number");
    
    setSubmitting(true);
    try {
      const res = await api.post("/user/book-temple/create-order", { 
        templeId: id,
        voucherCode: appliedVoucher?.code 
      });
      
      const orderData = res.data.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        name: "Sarvatirthamayi",
        description: `Temple Visit: ${temple?.name}`,
        order_id: orderData.id,
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/user/book-temple/verify", {
              ...response,
              bookingData: { ...formData, templeId: id, voucherCode: appliedVoucher?.code }
            });
            if (verifyRes.data.success) {
              setTicketUrl(verifyRes.data.ticketUrl);
              setShowSuccessView(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (vErr) {
            toast.error("Verification failed. Check email for ticket.");
          }
        },
        prefill: { name: formData.devoteeName, email: user.email, contact: formData.whatsappNumber },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setSubmitting(false) }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      toast.error("Payment setup failed.");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
      <Loader2 className="animate-spin text-purple-600 mb-4" size={50} />
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 italic uppercase">Invoking Connection...</h2>
    </div>
  );

  return (
    <div className={`min-h-screen pt-24 pb-12 transition-all duration-300 ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <Toaster position="top-right" />
      <main className="max-w-6xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {showSuccessView ? (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-[3.5rem] p-12 text-center shadow-2xl border dark:border-slate-800">
              <div className="mb-6 p-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full inline-block animate-bounce"><CheckCircle size={80} /></div>
              <h2 className="text-3xl font-black mb-4 italic">Journey Confirmed!</h2>
              <p className="text-slate-500 mb-10 text-lg font-medium">Your visit to <b>{temple?.name}</b> is scheduled. We have sent the ticket to your email.</p>
              <div className="space-y-4">
                <a href={`${import.meta.env.VITE_API_BASE_URL}${ticketUrl}`} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-purple-700 active:scale-95 transition-all"><Download size={24} /> Download E-Ticket</a>
                <button onClick={() => navigate("/")} className="w-full bg-slate-100 dark:bg-slate-800 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200">Return Home</button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* SIDEBAR */}
              <div className="lg:col-span-5 lg:sticky lg:top-28">
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border dark:border-slate-800">
                  <div className="h-72 relative">
                    <img src={temple?.image} alt={temple?.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
                    <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"><ChevronLeft size={20}/></button>
                    <div className="absolute bottom-6 left-8 right-8"><h2 className="text-3xl font-black mb-1 italic text-white leading-tight">{temple?.name}</h2><div className="flex items-center gap-2 text-purple-300 text-sm font-bold uppercase tracking-wider"><MapPin size={16}/> {temple?.city_name}</div></div>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    {/* ENHANCED BREAKDOWN */}
                    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-[2.5rem] border border-purple-100 dark:border-purple-800/50">
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest"><span>Standard Entry</span><span>₹{temple?.visit_price}</span></div>
                            {isAuthorizedMember && (
                                <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                    <span className="flex items-center gap-1.5"><ShieldCheck size={12}/> Authorized Member (0.7%)</span>
                                    <span>- ₹{membershipSavings}</span>
                                </div>
                            )}
                            {appliedVoucher && (
                                <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase tracking-tighter animate-in fade-in slide-in-from-right-2">
                                    <span className="flex items-center gap-1.5"><Ticket size={12}/> Divine Coupon</span>
                                    <span>- ₹{voucherSavings}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-purple-200 dark:border-purple-800">
                            <span className="text-[10px] uppercase font-black text-purple-600 tracking-widest">Total Payable</span>
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
                      <div><p className="text-xs font-black uppercase tracking-widest leading-none">Authorized Sovereign Member</p><p className="text-[10px] font-medium opacity-80 mt-1.5 uppercase">Exclusive divine savings are applied to your visit.</p></div>
                    </motion.div>
                  ) : (
                    <motion.div whileHover={{ y: -2 }} className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-[2.5rem] border border-amber-500/20 relative overflow-hidden group">
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="max-w-[70%]">
                          <h4 className="text-amber-700 dark:text-amber-400 font-black text-sm flex items-center gap-2 uppercase tracking-tighter"><Gift size={18} /> Exclusive Member Savings</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mt-1 uppercase tracking-tight leading-relaxed">Join the club to unlock an <span className="font-bold">instant 0.7% discount</span> on every sacred visit.</p>
                        </div>
                        <button onClick={() => navigate("/user/stm-club")} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all shrink-0">Join STM Club</button>
                      </div>
                      <Crown size={80} className="absolute -bottom-4 -right-4 text-amber-500/10 group-hover:rotate-12 transition-transform" />
                    </motion.div>
                  )}
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 lg:p-14 shadow-2xl border dark:border-slate-800">
                  <h3 className="text-3xl font-black mb-10 italic tracking-tighter">Devotee Enrollment</h3>
                  <div className="space-y-8">
                    {/* VOUCHER DISCOVERY UI */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3"><Ticket className="text-indigo-600" size={18}/><h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Divine Promo Code</h4></div>
                        <button onClick={openCouponDiscovery} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-tighter flex items-center gap-1"><Sparkles size={12}/> View Offers</button>
                      </div>
                      {appliedVoucher ? (
                        <div className="flex items-center justify-between bg-indigo-600 text-white p-5 rounded-3xl shadow-xl animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-3"><CheckCircle size={22}/><p className="font-black text-xl tracking-[0.3em] ml-2">{appliedVoucher.code}</p></div>
                          <button onClick={() => setAppliedVoucher(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <input type="text" placeholder="ENTER CODE" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} className="flex-1 h-14 px-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold focus:border-indigo-500 transition-all uppercase tracking-widest text-sm"/>
                          <button onClick={() => handleApplyVoucher()} disabled={isVerifyingVoucher || !voucherCode} className="px-10 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all text-xs tracking-widest">{isVerifyingVoucher ? <Loader2 className="animate-spin" size={16}/> : "APPLY"}</button>
                        </div>
                      )}
                    </div>

                    <div className="relative group"><label className="absolute left-14 -top-2.5 px-2 bg-white dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-purple-600 z-10 transition-colors">Visit Date</label><Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input type="date" min={new Date().toISOString().split("T")[0]} className="w-full h-16 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 focus:border-purple-500 rounded-2xl outline-none font-bold" onChange={(e) => setFormData({...formData, visitDate: e.target.value})}/></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative"><User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input placeholder="Devotee Full Name" value={formData.devoteeName} className="w-full h-16 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:border-purple-500 border-2 border-transparent transition-all shadow-inner" onChange={(e) => setFormData({...formData, devoteeName: e.target.value})}/></div>
                      <div className="relative"><Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input placeholder="WhatsApp Contact" value={formData.whatsappNumber} className="w-full h-16 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold focus:border-purple-500 border-2 border-transparent transition-all shadow-inner" onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}/></div>
                    </div>

                    <div className="relative"><MessageSquare className="absolute left-6 top-7 text-slate-400" size={20}/><textarea placeholder="Gotra, Rashi, or Special Sankalpam (Optional)..." className="w-full py-6 pl-16 pr-4 h-40 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-medium resize-none shadow-inner border-2 border-transparent focus:border-purple-500 transition-all" onChange={(e) => setFormData({...formData, specialWish: e.target.value})}/></div>

                    <button onClick={handleInitialPayment} disabled={submitting} className="group w-full bg-purple-600 text-white h-24 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-5 disabled:opacity-50 relative overflow-hidden">
                      {submitting ? <Loader2 className="animate-spin" size={32} /> : (<><Lock size={24} className="text-purple-300"/><span>Pay ₹{finalPrice} & Confirm</span><ArrowRight size={28} className="group-hover:translate-x-2 transition-transform"/></>)}
                    </button>
                    <div className="flex items-center justify-center gap-4 pt-2 opacity-50"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" className="h-4" alt="Razorpay"/><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">256-Bit SSL Secure Connection</span></div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* DISCOVERY MODAL */}
      <AnimatePresence>
        {showCouponModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl border dark:border-slate-800 relative overflow-hidden">
              <Sparkles className="absolute -top-6 -left-6 text-indigo-500/10 w-32 h-32" />
              <div className="flex justify-between items-center mb-8 relative z-10"><h3 className="text-2xl font-black italic tracking-tighter">Divine Offers</h3><button onClick={() => setShowCouponModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24}/></button></div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {availableCoupons.length > 0 ? availableCoupons.map((cpn) => (
                  <motion.div key={cpn._id} whileHover={{ x: 5 }} onClick={() => handleApplyVoucher(cpn.code)} className="p-5 border-2 border-indigo-50 dark:border-indigo-900/30 rounded-[2rem] cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group">
                    <div className="flex justify-between items-start mb-2"><span className="font-mono font-black text-indigo-600 text-xl tracking-[0.2em]">{cpn.code}</span><span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full uppercase tracking-tighter">{cpn.discount_type === 'percentage' ? `${cpn.discount_value}% OFF` : `₹${cpn.discount_value} OFF`}</span></div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{cpn.description || "Valid for a limited duration on sacred visits."}</p>
                  </motion.div>
                )) : (
                  <div className="text-center py-10 opacity-50"><Ticket size={40} className="mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">No Active Offers</p></div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}