import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../../api/api";
import { FaChevronRight, FaSpinner } from "react-icons/fa";

export default function ViewMembership() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/memberships/${id}`)
      .then((res) => {
        setData(res.data.data || res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching membership:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
      <FaSpinner className="animate-spin text-indigo-600 text-3xl mb-4" />
      <p className="text-slate-400 italic">Retrieving Membership Details...</p>
    </div>
  );

  if (!data) return (
    <div className="p-10 text-center">
      <p className="text-red-500 font-bold">Membership not found.</p>
      <Link to="/admin/membership-card" className="mt-4 text-indigo-600 underline block">Go Back</Link>
    </div>
  );

  const labelClass = "text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1 block";
  const valueClass = "text-[14px] font-medium text-[#475569] block";

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Breadcrumbs matching Screenshot 7 */}
        <nav className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6">
          <Link to="/admin/membership-card" className="hover:text-indigo-600 transition-colors">
            Membership Cards
          </Link>
          <FaChevronRight size={8} />
          <span className="text-slate-600">View</span>
        </nav>

        {/* Main Card Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-[18px] font-semibold text-[#475569]">Membership Card Details</h2>
          </div>

          <div className="p-6 md:p-10">
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 mb-10">
              
              {/* Card Name */}
              <div>
                <label className={labelClass}>Card Name</label>
                <span className={valueClass}>{data.name}</span>
              </div>

              {/* Status Badge matches Screenshot 7 */}
              <div>
                <label className={labelClass}>Status</label>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase mt-1 ${data.status === 1 ? 'bg-[#22c55e]' : 'bg-red-500'}`}>
                  {data.status === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Duration Type */}
              <div>
                <label className={labelClass}>Duration Type</label>
                <span className={valueClass}>{data.duration_type === 1 ? 'Months' : 'Years'}</span>
              </div>

              {/* Duration */}
              <div>
                <label className={labelClass}>Duration</label>
                <span className={valueClass}>{data.duration}</span>
              </div>

              {/* Visits */}
              <div>
                <label className={labelClass}>Visits</label>
                <span className={valueClass}>{data.visits || 0}</span>
              </div>

              {/* Price */}
              <div>
                <label className={labelClass}>Price</label>
                <span className={valueClass}>{data.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <span className={`${valueClass} text-slate-500 italic`}>
                  {data.description || "N/A"}
                </span>
              </div>
            </div>

            {/* Temples List Section matching Screenshot 7 */}
            <div className="mb-10">
              <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-4 block">
                Temples and Maximum Visits
              </label>
              
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                {data.temples?.length > 0 ? data.temples.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <span className="text-[13px] text-[#64748b]">
                      {t.templeId?.name || t.name || "Unknown Temple"}
                    </span>
                    <span className="bg-[#818cf8] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                      {t.maxVisits || t.max_visits || 0} Visits
                    </span>
                  </div>
                )) : (
                  <div className="p-4 text-center text-slate-400 text-sm italic">
                    No specific temples assigned.
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer matching Screenshot 7 */}
            <div className="flex justify-end gap-3 pt-6">
              <button 
                onClick={() => navigate(`/admin/membership/edit/${id}`)}
                className="bg-[#f59e0b] hover:bg-amber-500 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                Edit
              </button>
              <button 
                onClick={() => navigate("/admin/membership-card")}
                className="bg-[#94a3b8] hover:bg-slate-500 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}