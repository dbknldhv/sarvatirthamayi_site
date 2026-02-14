import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ritualPackageService from "../../../../services/ritualPackageService";
import { ritualService } from "../../../../services/ritualService";
import toast, { Toaster } from "react-hot-toast";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";

const RitualPackageEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // States
  const [temples, setTemples] = useState([]);
  const [allRituals, setAllRituals] = useState([]); 
  const [filteredRituals, setFilteredRituals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    temple_id: "",
    ritual_id: "",
    name: "",
    price: "",
    devotees_count: 1,
    status: 1,
    description: ""
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        setInitialLoading(true);
        const [tData, rData, pkgRes] = await Promise.all([
          ritualService.getTemples(),
          ritualService.getAllRituals(),
          ritualPackageService.getById(id)
        ]);

        const pkgData = pkgRes.data;
        setTemples(tData || []);
        setAllRituals(rData || []);

        if (pkgData) {
          setFormData({
            name: pkgData.name || "",
            temple_id: pkgData.temple_id?._id || pkgData.temple_id || "",
            ritual_id: pkgData.ritual_id?._id || pkgData.ritual_id || "",
            price: pkgData.price || "0",
            devotees_count: pkgData.devotees_count || 1,
            status: pkgData.status !== undefined ? pkgData.status : 1,
            description: pkgData.description || ""
          });
        }
      } catch (err) {
        toast.error("Package not found or Server Error");
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (formData.temple_id && allRituals.length > 0) {
      const filtered = allRituals.filter(r => 
        (r.temple_id?._id || r.temple_id) === formData.temple_id
      );
      setFilteredRituals(filtered);
    }
  }, [formData.temple_id, allRituals]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        devotees_count: Number(formData.devotees_count),
        status: Number(formData.status)
      };
      await ritualPackageService.update(id, payload);
      toast.success("Package Updated Successfully!");
      setTimeout(() => navigate("/admin/ritual/package"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update package");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-20">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90"
          >
            <FiArrowLeft className="text-slate-600" size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Edit Ritual Package</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Update package configurations</p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            
            {/* Ritual Field (Read Only Style per Screenshot) */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ritual</label>
              <select 
                className="w-full bg-[#edf2f7] border-2 border-transparent p-4 rounded-xl font-bold text-slate-500 cursor-not-allowed appearance-none"
                value={formData.ritual_id}
                disabled
              >
                <option value="">Select Ritual</option>
                {allRituals.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>

            {/* Temple Field (Read Only Style per Screenshot) */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Temple</label>
              <select 
                className="w-full bg-[#edf2f7] border-2 border-transparent p-4 rounded-xl font-bold text-slate-500 cursor-not-allowed appearance-none"
                value={formData.temple_id}
                disabled
              >
                <option value="">Select Temple</option>
                {temples.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            {/* Package Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Package Name</label>
              <input 
                type="text" 
                className="w-full bg-white border-2 border-slate-100 p-4 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            {/* Status Dropdown */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select 
                className="w-full bg-white border-2 border-slate-100 p-4 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>

            {/* Devotees Count */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Devotees Count</label>
              <input 
                type="number" 
                className="w-full bg-white border-2 border-slate-100 p-4 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm"
                value={formData.devotees_count}
                onChange={(e) => setFormData({...formData, devotees_count: e.target.value})}
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
              <input 
                type="number" 
                className="w-full bg-white border-2 border-slate-100 p-4 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 mb-10">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              rows="5"
              className="w-full bg-white border-2 border-slate-100 p-4 rounded-xl focus:border-indigo-500 outline-none font-medium text-slate-600 transition-all shadow-sm resize-none"
              value={formData.description || ""}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-[#6366f1] hover:bg-[#4f46e5] text-white font-black px-10 py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
            >
              {loading ? <FiRefreshCw className="animate-spin" /> : null}
              {loading ? "UPDATING..." : "Update Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RitualPackageEdit;