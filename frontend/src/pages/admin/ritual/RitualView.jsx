import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ritualService } from "../../../services/ritualService";
import { ChevronRight, Image as ImageIcon } from "lucide-react";

const RitualView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ritual, setRitual] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    ritualService.getRitualById(id)
      .then((data) => {
        setRitual(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching ritual:", err);
        // Redirect back to list if ritual not found or error occurs
        navigate("/admin/ritual");
      });
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center font-sans text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          Loading ritual details...
        </div>
      </div>
    );
  }

  if (!ritual) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-600">
      {/* BREADCRUMB NAVIGATION */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-6">
        <span 
          className="cursor-pointer hover:text-indigo-600 transition-colors" 
          onClick={() => navigate("/admin/ritual")}
        >
          Rituals
        </span>
        <ChevronRight size={12} />
        <span className="text-slate-600 font-bold">View Ritual</span>
      </nav>

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* HEADER SECTION */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-700">Ritual Information</h2>
          <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded border">
            ID: {ritual._id || ritual.sql_id}
          </span>
        </div>

        <div className="p-8">
          {/* TOP GRID: NAME & TEMPLE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 mb-10">
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ritual Name</p>
              <p className="text-[16px] font-semibold text-slate-800">{ritual.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Associated Temple</p>
              <p className="text-[16px] font-semibold text-slate-800">{ritual.temple_name || "Not Assigned"}</p>
            </div>
          </div>

          {/* MIDDLE GRID: STATUS & SEQUENCE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 mb-10">
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Visibility Status</p>
              <span className={`inline-block px-3 py-1 rounded text-[10px] font-black tracking-widest text-white ${
                Number(ritual.status) === 1 ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {Number(ritual.status) === 1 ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Display Sequence</p>
              <p className="text-[16px] font-semibold text-slate-800">{ritual.sequence || 0}</p>
            </div>
          </div>

          {/* DESCRIPTION SECTION */}
          <div className="mb-10 space-y-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Description</p>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                {ritual.description || "No description provided for this ritual."}
                </p>
            </div>
          </div>

          {/* IMAGE SECTION */}
          <div className="mb-12 space-y-3">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ritual Cover Image</p>
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center group">
              {ritual.image ? (
                <img 
                  src={ritual.image} 
                  alt={ritual.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found'; }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={24} className="text-slate-300" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">No Image Available</span>
                </div>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              onClick={() => navigate("/admin/ritual")}
              className="px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition-all active:scale-95"
            >
              Back to List
            </button>
            <button 
              onClick={() => navigate(`/admin/ritual/edit/${ritual._id || ritual.sql_id}`)}
              className="px-8 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm shadow-md shadow-amber-200 transition-all active:scale-95"
            >
              Edit Ritual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RitualView;