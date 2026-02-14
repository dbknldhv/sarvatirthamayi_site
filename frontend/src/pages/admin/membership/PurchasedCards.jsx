import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, RotateCcw, Eye, ChevronLeft, ChevronRight, 
    ChevronsLeft, ChevronsRight, CreditCard, User, 
    Calendar, IndianRupee, Activity, ShieldCheck
} from 'lucide-react';
import api from "../../../api/api";
import { toast } from 'react-hot-toast';

const PurchasedCards = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        cardStatus: 'All',
        paymentStatus: 'All',
        page: 1,
        limit: 10
    });
    const [pagination, setPagination] = useState({
        totalRecords: 0,
        totalPages: 0
    });

    const fetchPurchasedCards = useCallback(async () => {
        setLoading(true);
        try {
            const { search, cardStatus, paymentStatus, page, limit } = filters;
            
            const queryParams = {
                page: page || 1,
                limit: limit || 10,
                search: search ? search.trim() : "",
                cardStatus: cardStatus || "All",
                paymentStatus: paymentStatus || "All"
            };

            const response = await api.get('/admin/purchased-memberships', { params: queryParams });
            
            if (response.data.success) {
                setData(response.data.data);
                setPagination({
                    totalRecords: response.data.totalRecords || 0,
                    totalPages: response.data.totalPages || 1
                });
            }
        } catch (error) {
            toast.error("Failed to load records");
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPurchasedCards();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [filters.search, filters.cardStatus, filters.paymentStatus, filters.page, fetchPurchasedCards]);

    const resetFilters = () => {
        setFilters({
            search: '',
            cardStatus: 'All',
            paymentStatus: 'All',
            page: 1,
            limit: 10
        });
    };

    const getCardStatusBadge = (status) => {
        const s = Number(status);
        const styles = {
            0: "bg-slate-100 text-slate-600 border-slate-200", 
            1: "bg-emerald-50 text-emerald-700 border-emerald-200", 
            2: "bg-rose-50 text-rose-700 border-rose-200",
        };
        const labels = { 0: "INACTIVE", 1: "ACTIVE", 2: "EXPIRED" };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[s] || styles[0]}`}>
                {labels[s] || "UNKNOWN"}
            </span>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const s = Number(status);
        const styles = {
            1: "bg-amber-50 text-amber-700 border-amber-200", 
            2: "bg-emerald-50 text-emerald-700 border-emerald-200", 
            3: "bg-rose-50 text-rose-700 border-rose-200",
        };
        const labels = { 1: "PENDING", 2: "PAID", 3: "FAILED" };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[s] || styles[1]}`}>
                {labels[s] || "PENDING"}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen font-sans">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-purple-600" size={24} />
                    Purchased Memberships
                </h1>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
                    Membership Management &gt; Sales Records
                </p>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-slate-200">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Razorpay ID or User..."
                            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    
                    <div className="flex flex-wrap md:flex-nowrap gap-3 w-full lg:w-auto">
                        <select 
                            className="flex-1 md:w-44 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-purple-500 bg-white"
                            value={filters.cardStatus}
                            onChange={(e) => setFilters(prev => ({...prev, cardStatus: e.target.value, page: 1}))}
                        >
                            <option value="All">All Card Status</option>
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                            <option value="2">Expired</option>
                        </select>

                        <select 
                            className="flex-1 md:w-44 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-purple-500 bg-white"
                            value={filters.paymentStatus}
                            onChange={(e) => setFilters(prev => ({...prev, paymentStatus: e.target.value, page: 1}))}
                        >
                            <option value="All">All Payment Status</option>
                            <option value="1">Pending</option>
                            <option value="2">Paid</option>
                            <option value="3">Failed</option>
                        </select>

                        <button 
                            onClick={resetFilters}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-50 transition-colors w-full md:w-auto"
                        >
                            <RotateCcw size={16} /> Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest border-b border-slate-100">
                                <th className="p-4 font-bold">User Information</th>
                                <th className="p-4 font-bold">Card Details</th>
                                <th className="p-4 font-bold">Validity</th>
                                <th className="p-4 text-center font-bold">Visits</th>
                                <th className="p-4 font-bold">Amount</th>
                                <th className="p-4 text-center font-bold">Status</th>
                                <th className="p-4 text-center font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="p-12 text-center text-slate-400">Loading records...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan="7" className="p-12 text-center text-slate-400 font-medium">No records found.</td></tr>
                            ) : data.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">
                                            {item.user_id?.name || 'Unknown User'}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mt-0.5 uppercase">
                                            <User size={10}/> {item.user_id?.mobile_number || '-'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <div className="p-1.5 bg-purple-50 rounded text-purple-600">
                                                <CreditCard size={14} />
                                            </div>
                                            {item.membership_card_id?.name || 'Standard Card'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-[12px] font-medium text-slate-500">
                                        {item.end_date ? new Date(item.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {item.used_visits ?? 0} / {item.max_visits ?? 0}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">₹{item.paid_amount?.toLocaleString() || 0}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-center gap-1">
                                            {getCardStatusBadge(item.card_status)}
                                            {getPaymentStatusBadge(item.payment_status)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => navigate(`/admin/purchased-member-card/view/${item._id}`)}
                                            className="text-purple-600 hover:text-white hover:bg-purple-600 border border-purple-100 p-2 rounded-lg transition-all shadow-sm"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View remains similar but path updated */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/30">
                    {!loading && data.map((item) => (
                        <div key={item._id} className="p-4 bg-white mb-2 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {(item.user_id?.name || 'U')[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{item.user_id?.name}</div>
                                        <div className="text-[11px] text-slate-400 font-bold">{item.user_id?.mobile_number}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/admin/purchased-member-card/view/${item._id}`)}
                                    className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                            {/* ... Rest of mobile UI ... */}
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center bg-slate-50 border-t border-slate-100 gap-4">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-tight">
                        Showing {data.length} of {pagination.totalRecords} results
                    </div>
                    <div className="flex items-center gap-1">
                        <button disabled={filters.page === 1} onClick={() => setFilters(p => ({...p, page: 1}))} className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm"><ChevronsLeft size={16}/></button>
                        <button disabled={filters.page === 1} onClick={() => setFilters(p => ({...p, page: p.page - 1}))} className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-black text-purple-600 px-4 py-2 bg-purple-50 rounded-lg mx-2 border border-purple-100">Page {filters.page}</span>
                        <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(p => ({...p, page: p.page + 1}))} className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm"><ChevronRight size={16}/></button>
                        <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(p => ({...p, page: pagination.totalPages}))} className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm"><ChevronsRight size={16}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchasedCards;