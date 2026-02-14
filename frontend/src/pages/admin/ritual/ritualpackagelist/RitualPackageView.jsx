import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ritualPackageService } from "../../../../services/ritualPackageService";
import { FiArrowLeft, FiEdit3, FiInfo, FiHash, FiMapPin, FiUsers } from "react-icons/fi";

const RitualPackageView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ritualPackageService.getById(id)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Details...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-20 text-center italic text-slate-500">Package record not found.</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-24">
      <div className="max-w-5xl mx-auto">
        
        {/* Breadcrumb / Navigation */}
        <div className="flex items-center gap-2 mb-6 text-slate-400 text-sm font-medium">
          <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate("/admin/ritual/package")}>Ritual Packages</span>
          <span>&rsaquo;</span>
          <span className="text-slate-900 font-bold">View</span>
        </div>

        {/* Main Display Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Header Strip - Migration Info */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
            
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              data.status === 1 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}>
              {data.status === 1 ? "● Active" : "○ Inactive"}
            </span>
          </div>

          <div className="p-6 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Package Details</h1>
                <p className="text-slate-400 text-sm font-medium">Detailed configuration for this ritual offering.</p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => navigate(`/admin/ritual/package/edit/${data._id}`)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-amber-100"
                >
                  <FiEdit3 /> Edit
                </button>
                <button 
                  onClick={() => navigate(-1)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                >
                   Back
                </button>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
              
              {/* Ritual Info */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Ritual Category</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    {data.ritual_id?.name?.charAt(0) || "R"}
                  </div>
                  <p className="text-lg font-bold text-slate-800">{data.ritual_id?.name || "N/A"}</p>
                </div>
              </div>

              {/* Temple Info */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Temple Location</label>
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <FiMapPin className="text-indigo-400" />
                  <p>{data.temple_id?.name || "Main Branch"}</p>
                </div>
              </div>

              {/* Package Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Package Name</label>
                <p className="text-xl font-black text-indigo-600">{data.name}</p>
              </div>

              {/* Devotees Count */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Capacity</label>
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <FiUsers className="text-indigo-400" />
                  <p>{data.devotees_count} Person(s)</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Booking Price</label>
                <p className="text-3xl font-black text-slate-900">
                  <span className="text-slate-400 text-lg mr-1 font-bold">₹</span>
                  {parseFloat(data.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Status Display */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Service Status</label>
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${data.status === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                   <p className="font-bold text-slate-700 uppercase tracking-tighter">{data.status === 1 ? "Accepting Bookings" : "Temporarily Offline"}</p>
                </div>
              </div>

            </div>

            {/* Description Section */}
            <div className="mt-12 pt-12 border-t border-slate-50">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-4">Description & Terms</label>
              <div className="bg-slate-50 rounded-3xl p-6 md:p-8 text-slate-600 leading-relaxed text-sm md:text-base border border-slate-100 italic">
                {data.description || "No specific instructions or description provided for this ritual package."}
              </div>
            </div>

          </div>
        </div>

        {/* Audit Info Footer */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          <span>Created: {new Date(data.created_at).toLocaleDateString()}</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span>Records Verified</span>
        </div>

      </div>
    </div>
  );
};

export default RitualPackageView;