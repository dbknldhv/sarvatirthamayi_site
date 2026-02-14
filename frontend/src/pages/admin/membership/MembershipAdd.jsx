import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { membershipService } from "../../../services/membershipService"; // Using the service
import { FaChevronRight, FaSpinner, FaTrash } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const MembershipAdd = () => {
  const navigate = useNavigate();
  const [allTemples, setAllTemples] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    status: 1,
    duration_type: 1,
    duration: 1,
    price: "",
    visits: 1,
    description: "",
    selectedTemples: [] // UI local state
  });

  // 1. Fetch Master Data
  useEffect(() => {
    const init = async () => {
      try {
        const data = await membershipService.getInitialData();
        setAllTemples(data.temples || []);
      } catch (err) {
        toast.error("Failed to load initial data");
      } finally {
        setFetching(false);
      }
    };
    init();
  }, []);

  // 2. Manage Temple Selection
  const handleAddTemple = (e) => {
    const tId = e.target.value;
    if (!tId) return;

    if (formData.selectedTemples.some(t => t.templeId === tId)) {
      return toast.error("Temple already added");
    }

    const templeObj = allTemples.find(t => t._id === tId);
    if (templeObj) {
      setFormData({
        ...formData,
        selectedTemples: [
          ...formData.selectedTemples, 
          { templeId: tId, name: templeObj.name, maxVisits: 1 }
        ]
      });
    }
  };

  const removeTemple = (index) => {
    const updated = formData.selectedTemples.filter((_, i) => i !== index);
    setFormData({ ...formData, selectedTemples: updated });
  };

  const updateTempleVisits = (index, value) => {
    const updated = [...formData.selectedTemples];
    updated[index].maxVisits = Number(value);
    setFormData({ ...formData, selectedTemples: updated });
  };

  // 3. Submit logic using MembershipService
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.selectedTemples.length === 0) {
      return toast.error("Please add at least one temple");
    }

    setLoading(true);
    try {
      // Pass raw formData to service; service handles Number() and payload mapping
      await membershipService.create(formData);
      
      toast.success("Membership created successfully!");
      setTimeout(() => navigate("/admin/membership-card"), 1500);
    } catch (err) {
      console.error("Submission Error:", err);
      // Detailed error message from backend
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to create membership";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-600 bg-white";
  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block ml-1";

  if (fetching) return (
    <div className="flex h-screen items-center justify-center">
      <FaSpinner className="animate-spin text-indigo-600 text-3xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto">
        
        <nav className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6">
          <Link to="/admin/membership-card" className="hover:text-indigo-600 transition-colors">Membership Cards</Link>
          <FaChevronRight size={8} />
          <span className="text-slate-600">Create New Card</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">New Membership Card</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              
              <div className="md:col-span-2">
                <label className={labelClass}>Card Plan Name</label>
                <input required type="text" className={inputClass} placeholder="e.g. Gold Annual Pass"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Price (INR)</label>
                <input required type="number" className={inputClass} value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Type</label>
                  <select className={inputClass} value={formData.duration_type}
                    onChange={(e) => setFormData({ ...formData, duration_type: Number(e.target.value) })}>
                    <option value={1}>Months</option>
                    <option value={2}>Years</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Duration</label>
                  <input required type="number" className={inputClass} value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Overall Visit Limit</label>
                <input required type="number" className={inputClass} value={formData.visits}
                  onChange={(e) => setFormData({ ...formData, visits: e.target.value })} />
              </div>

              {/* Temple Assignment */}
              <div className="md:col-span-2 border-t pt-6">
                <label className="text-sm font-bold text-slate-700 mb-4 block">Assign Temples</label>
                <select className={inputClass} onChange={handleAddTemple} value="">
                  <option value="">-- Select Temple to Add --</option>
                  {allTemples.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>

                <div className="mt-4 space-y-3">
                  {formData.selectedTemples.map((temple, index) => (
                    <div key={temple.templeId} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Temple</span>
                        <span className="font-semibold text-slate-700">{temple.name}</span>
                      </div>
                      <div className="w-24">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Visits</label>
                        <input type="number" min="1" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1"
                          value={temple.maxVisits} onChange={(e) => updateTempleVisits(index, e.target.value)} />
                      </div>
                      <button type="button" onClick={() => removeTemple(index)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea rows="3" className={`${inputClass} resize-none`} value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={() => navigate("/admin/membership-card")} className="px-6 py-3 font-bold text-slate-400">
                Cancel
              </button>
              <button disabled={loading} type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
                {loading ? <FaSpinner className="animate-spin" /> : "Create Card"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MembershipAdd;