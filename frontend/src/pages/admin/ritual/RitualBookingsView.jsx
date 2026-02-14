import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ritualBookingService } from '../../../services/ritualBookingService';
import { ArrowLeft, Calendar, User, CreditCard, MapPin, Phone, Hash, Info, CheckCircle2, Clock, XCircle } from 'lucide-react';

const RitualBookingsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);

  useEffect(() => { ritualBookingService.getById(id).then(setBooking); }, [id]);

  if (!booking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-medium">Loading Detail Profile...</div>;

  const getStatusStyle = (status) => {
    const map = {
      '2': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={16}/>, label: 'CONFIRMED' },
      '3': { bg: 'bg-rose-100', text: 'text-rose-700', icon: <XCircle size={16}/>, label: 'CANCELLED' }
    };
    return map[status?.toString()] || { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={16}/>, label: 'PENDING' };
  };

  const bStatus = getStatusStyle(booking.booking_status);
  const pStatus = getStatusStyle(booking.payment_status);

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 shadow-sm transition-all font-bold text-sm uppercase tracking-tight">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-3">
             <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black ${bStatus.bg} ${bStatus.text}`}>
               {bStatus.icon} {bStatus.label}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-8 border-b border-slate-50 gap-4">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 leading-tight">{booking.ritual_id?.name}</h2>
                  <p className="text-blue-600 font-bold flex items-center gap-1.5 uppercase tracking-wide text-xs">
                    <MapPin size={14}/> {booking.temple_id?.name}
                  </p>
                </div>
                <div className="bg-slate-50 px-4 py-3 rounded-2xl text-center min-w-[120px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Number</p>
                  <p className="text-slate-700 font-mono font-bold tracking-tighter">#{booking.booking_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DetailBox icon={<Calendar className="text-blue-500"/>} label="Scheduled For" value={new Date(booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <DetailBox icon={<Info className="text-indigo-500"/>} label="Package Type" value={booking.ritual_package_id?.name} />
                <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-2xl">
                  <DetailBox icon={<Hash className="text-blue-600"/>} label="Sankalpam / Wish" value={booking.wish || 'General well-being'} isLongText />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
              <DetailBox icon={<User className="text-slate-400"/>} label="Primary Devotee" value={booking.devotees_name} />
              <DetailBox icon={<Phone className="text-emerald-500"/>} label="WhatsApp Contact" value={booking.whatsapp_number} />
              <DetailBox label="Registered Account" value={`${booking.user_id?.first_name} ${booking.user_id?.last_name}`} />
              <DetailBox label="Account Email" value={booking.user_id?.email} />
            </section>
          </div>

          {/* Payment Card */}
          <div className="space-y-6">
            <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200">
              <div className="flex items-center gap-2 mb-8 opacity-60">
                <CreditCard size={18}/>
                <h3 className="text-[10px] font-black uppercase tracking-widest">Financial Summary</h3>
              </div>
              
              <div className="space-y-5">
                <div className="flex justify-between items-center opacity-80 text-sm">
                  <span>Gross Amount</span>
                  <span className="font-bold">₹{booking.original_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 text-sm">
                  <span>Applied Discount</span>
                  <span className="font-bold">-₹{booking.offer_discount_amount?.toFixed(2)}</span>
                </div>
                <div className="pt-5 border-t border-white/10 flex justify-between items-end">
                   <div>
                     <p className="text-[10px] font-black opacity-50 uppercase mb-1">Final Amount</p>
                     <p className="text-4xl font-black">₹{booking.paid_amount?.toFixed(2)}</p>
                   </div>
                   <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${pStatus.bg} ${pStatus.text}`}>
                     {pStatus.label}
                   </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold opacity-50 uppercase">Gateway</p>
                  <p className="text-xs font-bold">{booking.payment_type === 2 ? 'Razorpay' : 'Cash'}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold opacity-50 uppercase">TXN Date</p>
                  <p className="text-xs font-bold">{booking.payment_date ? new Date(booking.payment_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </section>

            {booking.payment_type === 2 && (
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway IDs</h4>
                <div>
                  <p className="text-[9px] font-bold text-slate-300 uppercase">Payment ID</p>
                  <p className="text-[11px] font-mono font-bold text-slate-600 break-all leading-tight mt-1">{booking.razorpay_payment_id}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-300 uppercase">Order ID</p>
                  <p className="text-[11px] font-mono font-bold text-slate-600 break-all leading-tight mt-1">{booking.razorpay_order_id}</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailBox = ({ icon, label, value, isLongText }) => (
  <div className="flex items-start gap-4">
    {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
    <div>
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-slate-700 font-bold leading-relaxed ${isLongText ? 'text-sm italic font-medium' : 'text-base'}`}>{value || '-'}</p>
    </div>
  </div>
);

export default RitualBookingsView;