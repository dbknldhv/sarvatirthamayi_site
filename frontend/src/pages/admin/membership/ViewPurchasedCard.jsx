import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, User, CreditCard, Calendar, 
    IndianRupee, Hash, MapPin, CheckCircle2, Clock 
} from 'lucide-react';
import api from "../../../api/api";
import { toast } from 'react-hot-toast';

const ViewPurchasedCard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCardDetails = async () => {
            try {
                // Adjust this endpoint based on your backend route
                const response = await api.get(`/admin/purchased-memberships/${id}`);
                if (response.data.success) {
                    setCard(response.data.data);
                }
            } catch (error) {
                toast.error("Failed to load membership details");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchCardDetails();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-slate-500">Loading details...</div>;
    if (!card) return <div className="p-10 text-center text-rose-500">Membership record not found.</div>;

    const statusColors = {
        1: "bg-emerald-50 text-emerald-700 border-emerald-200",
        0: "bg-slate-50 text-slate-600 border-slate-200",
        2: "bg-rose-50 text-rose-700 border-rose-200"
    };

    return (
        <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-purple-600 transition-colors mb-2 text-sm font-medium"
                    >
                        <ChevronLeft size={16} /> Back to List
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">Membership Details</h1>
                </div>
                <div className={`px-4 py-1.5 rounded-full border text-sm font-bold ${statusColors[card.card_status]}`}>
                    {card.card_status === 1 ? 'ACTIVE' : card.card_status === 2 ? 'EXPIRED' : 'INACTIVE'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. User & Membership Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-purple-600" /> Member Information
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name</label>
                                <p className="text-slate-800 font-bold">{card.user_id?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Number</label>
                                <p className="text-slate-800 font-bold">{card.user_id?.mobile_number || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Birthday</label>
                                <p className="text-slate-600 font-medium">
                                    {card.birthday ? new Date(card.birthday).toLocaleDateString('en-GB') : 'Not Provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Important Date</label>
                                <p className="text-slate-600 font-medium">
                                    {card.important_date ? new Date(card.important_date).toLocaleDateString('en-GB') : 'Not Provided'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <MapPin size={16} className="text-purple-600" /> Favorite Temples
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {card.favorite_temples?.length > 0 ? (
                                    card.favorite_temples.map((temple, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 text-sm font-medium">
                                            {temple}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-slate-400 italic">No favorite temples selected</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Card & Payment Stats */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-purple-200">
                        <div className="flex justify-between items-start mb-8">
                            <CreditCard size={32} opacity={0.8} />
                            <div className="text-right">
                                <p className="text-[10px] font-bold opacity-70 tracking-widest uppercase">Plan Name</p>
                                <p className="text-lg font-black">{card.membership_card_id?.name || 'Sovereign'}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold opacity-70 uppercase">Member ID</p>
                                <p className="font-mono tracking-wider">STM-{card._id.toString().slice(-12).toUpperCase()}</p>
                            </div>
                            <div className="flex justify-between text-xs">
                                <div>
                                    <p className="opacity-70 uppercase font-bold text-[9px]">Valid From</p>
                                    <p>{new Date(card.start_date).toLocaleDateString('en-GB')}</p>
                                </div>
                                <div>
                                    <p className="opacity-70 uppercase font-bold text-[9px]">Expires On</p>
                                    <p>{new Date(card.end_date).toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Details</h3>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Hash size={14} /> Order ID
                            </div>
                            <span className="text-xs font-bold text-slate-700">{card.razorpay_order_id}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Clock size={14} /> Paid On
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                                {card.payment_date ? new Date(card.payment_date).toLocaleDateString('en-GB') : 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <IndianRupee size={14} /> Total Paid
                            </div>
                            <span className="text-lg font-black text-purple-600">₹{card.paid_amount?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ViewPurchasedCard;