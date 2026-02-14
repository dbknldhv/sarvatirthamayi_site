import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ritualPackageService from "../../../../services/ritualPackageService";
import { ritualService } from "../../../../services/ritualService";
import toast, { Toaster } from "react-hot-toast";
import { FiArrowLeft, FiSave, FiCheckCircle, FiInfo } from "react-icons/fi";

const RitualPackageAdd = () => {
  const navigate = useNavigate();
  const [temples, setTemples] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRituals, setFetchingRituals] = useState(false);

  const [formData, setFormData] = useState({
    temple_id: "",
    ritual_id: "",
    name: "",
    price: "",
    devotees_count: 1,
    status: 1,
    description: ""
  });

  // Load Temples on mount
  useEffect(() => {
    const loadTemples = async () => {
      try {
        const data = await ritualService.getTemples();
        setTemples(data);
      } catch (err) {
        toast.error("Failed to load temples");
      }
    };
    loadTemples();
  }, []);

  // Load Rituals when temple selection changes
  useEffect(() => {
    const loadRituals = async () => {
      if (!formData.temple_id) {
        setRituals([]);
        return;
      }
      
      setFetchingRituals(true);
      try {
        const allRituals = await ritualService.getAllRituals();
        
        // Fix: Ensuring comparison works whether temple_id is an object or string
        const filtered = allRituals.filter(r => {
          const ritualTempleId = r.temple_id?._id || r.temple_id;
          return ritualTempleId === formData.temple_id;
        });

        // Remove duplicates by name for a cleaner UI
        const uniqueRituals = Array.from(
          new Map(filtered.map(item => [item.name, item])).values()
        );
        
        setRituals(uniqueRituals);
        
        if (uniqueRituals.length === 0) {
          toast.error("No rituals found for this temple. Please add rituals to this temple first.");
        }
      } catch (err) {
        toast.error("Failed to load rituals");
      } finally {
        setFetchingRituals(false);
      }
    };
    loadRituals();
  }, [formData.temple_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ritual_id) {
      toast.error("Please select a ritual");
      return;
    }

    setLoading(true);
    const payload = {
      ...formData,
      price: Number(formData.price),
      devotees_count: Number(formData.devotees_count),
      status: Number(formData.status)
    };

    try {
      await ritualPackageService.create(payload);
      toast.success("Ritual Package Created Successfully!");
      setTimeout(() => navigate("/admin/ritual/package"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-20">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/admin/ritual/package")}
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90"
            >
              <FiArrowLeft className="text-slate-600" size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Ritual Package</h1>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Add details for new pooja/ritual offering</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            
            {/* Temple Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Select Temple</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-0 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                value={formData.temple_id}
                onChange={(e) => setFormData({...formData, temple_id: e.target.value, ritual_id: ""})}
                required
              >
                <option value="">Choose a Temple</option>
                {temples.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            {/* Ritual Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Ritual Service</label>
              <div className="relative">
                <select 
                  className={`w-full p-4 rounded-2xl border-2 border-transparent outline-none font-bold transition-all appearance-none cursor-pointer ${
                    !formData.temple_id ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-500'
                  }`}
                  value={formData.ritual_id}
                  onChange={(e) => setFormData({...formData, ritual_id: e.target.value})}
                  required
                  disabled={!formData.temple_id || fetchingRituals}
                >
                  <option value="">
                    {fetchingRituals ? "Loading Rituals..." : !formData.temple_id ? "Select Temple First" : "Select Ritual"}
                  </option>
                  {rituals.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
                {rituals.length === 0 && formData.temple_id && !fetchingRituals && (
                   <p className="absolute -bottom-6 left-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                     <FiInfo size={12}/> This temple has no rituals assigned.
                   </p>
                )}
              </div>
            </div>

            {/* Package Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Package Name (e.g., 3-Person Pooja)</label>
              <input 
                type="text" 
                placeholder="Enter display name"
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Current Status</label>
              <select 
                className={`w-full border-2 border-transparent p-4 rounded-2xl outline-none font-black transition-all appearance-none cursor-pointer ${
                  Number(formData.status) === 1 ? 'bg-emerald-50 text-emerald-600 focus:border-emerald-500' : 'bg-slate-100 text-slate-400 focus:border-slate-400'
                }`}
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                required
              >
                <option value={1}>ACTIVE</option>
                <option value={0}>INACTIVE</option>
              </select>
            </div>

            {/* Devotees Count */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Devotees Count</label>
              <input 
                type="number" 
                min="1"
                className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                value={formData.devotees_count}
                onChange={(e) => setFormData({...formData, devotees_count: e.target.value})}
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Price (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-transparent pl-8 pr-4 py-4 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none font-black text-slate-900 transition-all text-lg"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 mb-10">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Package Description</label>
            <textarea 
              rows="4"
              placeholder="Describe what is included in this package..."
              className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none font-medium text-slate-700 transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
             <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              <FiSave size={20} />
              {loading ? "PROCESSING..." : "CREATE RITUAL PACKAGE"}
            </button>
            <button 
              type="button"
              onClick={() => navigate("/admin/ritual/package")}
              className="sm:w-32 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RitualPackageAdd;