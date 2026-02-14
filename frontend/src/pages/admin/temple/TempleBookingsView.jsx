import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { templeBookingService } from "../../../services/templeBookingService";
import { FiChevronRight, FiArrowLeft, FiInfo } from "react-icons/fi";

const TempleBookingsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await templeBookingService.getTempleBookingById(id);
        if (res.success) {
          setData(res.booking);
        }
      } catch (err) {
        console.error("Error fetching booking details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  // Helper to safely render Temple Name regardless of ID or Object status
  const renderTempleName = () => {
    if (!data?.temple_id) return "N/A";
    // If it's an object (populated), return name. If string (ID), return the ID.
    return typeof data.temple_id === 'object' ? data.temple_id.name : `Temple ID: ${data.temple_id}`;
  };

  const getStatusBadge = (type, val) => {
    const v = Number(val);
    const styles = {
      pending: "bg-orange-500 text-white",
      confirmed: "bg-green-500 text-white",
      failed: "bg-red-500 text-white",
      cancelled: "bg-gray-400 text-white"
    };

    if (type === "booking") {
      if (v === 2) return <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${styles.confirmed}`}>Confirmed</span>;
      if (v === 3) return <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${styles.cancelled}`}>Cancelled</span>;
      return <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${styles.pending}`}>Pending</span>;
    }

    if (v === 2) return <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${styles.confirmed}`}>Paid</span>;
    if (v === 3) return <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${styles.failed}`}>Failed</span>;
    return <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${styles.pending}`}>Pending</span>;
  };

  if (loading) return <div className="p-20 text-center font-medium text-gray-500 italic">Fetching secure records...</div>;
  if (!data) return <div className="p-20 text-center font-medium text-red-500">Record not found or access denied.</div>;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
      {/* Breadcrumb - View Only Mode */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 max-w-6xl mx-auto">
        <p>
    Temple Bookings
  </p>       
   <FiChevronRight />
        <span className="text-gray-600 font-medium">View Only Mode</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-6xl mx-auto overflow-hidden">
        {/* Read-only Header Notice */}
        <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 md:px-10 flex items-center gap-2 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
          <FiInfo size={14} /> This record is locked for editing.
        </div>

        <div className="p-6 md:p-10">
          <h2 className="text-xl font-semibold text-slate-700 mb-8 pb-4 border-b border-gray-100">
            Temple Booking Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-16">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Devotee Name</label>
                <p className="text-gray-800 font-semibold">{data.devotees_name}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Temple Name</label>
                <p className="text-gray-800 font-semibold">{renderTempleName()}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WhatsApp Number</label>
                <p className="text-gray-800 font-semibold">{data.whatsapp_number}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Devotee Wish</label>
                <p className="text-gray-600 bg-slate-50 p-3 rounded-lg text-sm italic">"{data.wish || "No wish provided."}"</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Booking Status</label>
                {getStatusBadge("booking", data.booking_status)}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Visit Date</label>
                <p className="text-gray-800 font-semibold">
                  {new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Booked By (User)</label>
                <p className="text-gray-800 font-semibold">{data.user_id?.name || "Guest/Anonymous"}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="text-md font-bold text-slate-700 mb-8 flex items-center gap-2">
              Payment Transaction Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-16">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Type</label>
                  <p className="text-gray-800 font-semibold">{data.payment_mode || "Online/Razorpay"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Original Amount</label>
                  <p className="text-gray-600 font-medium">₹{data.original_amount?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 text-indigo-500">Paid Amount (Net)</label>
                  <p className="text-indigo-700 font-black text-xl">₹{data.paid_amount?.toFixed(2) || "0.00"}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Status</label>
                  {getStatusBadge("payment", data.payment_status)}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount Applied</label>
                  <p className="text-gray-800 font-semibold text-rose-500">- ₹{data.discount_amount?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-between items-center border-t border-gray-50 pt-6">
             <p className="text-[10px] text-gray-400">Transaction ID: {data._id}</p>
             <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-12 py-3 rounded-xl font-bold transition-all shadow-md"
            >
              <FiArrowLeft /> Back to List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempleBookingsView;