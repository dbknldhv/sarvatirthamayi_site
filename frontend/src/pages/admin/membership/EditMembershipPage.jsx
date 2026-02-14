import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../../api/api"; 
import { toast, Toaster } from "react-hot-toast";
import { FaChevronRight, FaSpinner, FaTrash } from "react-icons/fa";

export default function EditMembershipPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allTemples, setAllTemples] = useState([]); 

  const [formData, setFormData] = useState({
    name: "",
    status: 1, // Using numbers to match Mongoose schema
    duration_type: 1,
    duration: 1,
    price: "",
    visits: 1, // Overall visits field
    description: "",
    selectedTemples: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [membRes, templesRes] = await Promise.all([
          api.get(`/admin/memberships/${id}`),
          api.get("/admin/memberships/temples-list") 
        ]);

        const m = membRes.data.data || membRes.data;
        setAllTemples(templesRes.data || []);

        const mappedTemples = (m.temples || []).map(t => ({
          templeId: t.templeId?._id || t.templeId,
          name: t.name || t.templeId?.name || "Unknown Temple",
          maxVisits: t.maxVisits || 1 
        }));

        setFormData({
          name: m.name || "",
          status: m.status !== undefined ? m.status : 1,
          duration_type: m.duration_type || 1,
          duration: m.duration || 1,
          price: m.price || "",
          visits: m.visits || 1,
          description: m.description || "",
          selectedTemples: mappedTemples
        });
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Failed to load membership data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.selectedTemples.length === 0) {
      return toast.error("Please add at least one temple");
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
        visits: Number(formData.visits),
        status: Number(formData.status),
        duration_type: Number(formData.duration_type),
        temples: formData.selectedTemples.map(t => ({
          templeId: t.templeId,
          name: t.name,
          maxVisits: Number(t.maxVisits)
        }))
      };

      await api.put(`/admin/memberships/update/${id}`, payload);
      toast.success("Membership updated successfully!");
      setTimeout(() => navigate("/admin/membership-card"), 1500);
    } catch (err) {
      console.error("Update Error:", err);
      toast.error(err.response?.data?.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const addTemple = (e) => {
    const tId = e.target.value;
    if (!tId) return;
    if (formData.selectedTemples.some(item => item.templeId === tId)) {
      return toast.error("Temple already added");
    }
    const temple = allTemples.find(t => t._id === tId);
    setFormData({
      ...formData,
      selectedTemples: [...formData.selectedTemples, { templeId: tId, name: temple.name, maxVisits: 1 }]
    });
  };

  const removeTemple = (idx) => {
    const list = formData.selectedTemples.filter((_, i) => i !== idx);
    setFormData({...formData, selectedTemples: list});
  };

  const updateVisits = (idx, val) => {
    const list = [...formData.selectedTemples];
    list[idx].maxVisits = Number(val);
    setFormData({...formData, selectedTemples: list});
  };

  const inputClass = "w-full border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-600 bg-white";
  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block ml-1";

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <FaSpinner className="animate-spin text-3xl text-indigo-600"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3 md:p-8 font-sans">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6">
          <Link to="/admin/membership-card" className="hover:text-indigo-600 transition-colors">Membership Cards</Link>
          <FaChevronRight size={8} />
          <span className="text-slate-600">Edit Card</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">Edit Membership Plan</h2>
          </div>

          <form onSubmit={handleUpdate} className="p-5 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              
              {/* Basic Details */}
              <div className="md:col-span-2">
                <label className={labelClass}>Card Plan Name</label>
                <input required type="text" className={inputClass} 
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

              {/* Duration Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Duration Unit</label>
                  <select className={inputClass} value={formData.duration_type}
                    onChange={(e) => setFormData({ ...formData, duration_type: Number(e.target.value) })}>
                    <option value={1}>Months</option>
                    <option value={2}>Years</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Length</label>
                  <input required type="number" className={inputClass} value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Total Overall Visits</label>
                <input required type="number" className={inputClass} value={formData.visits}
                  onChange={(e) => setFormData({ ...formData, visits: e.target.value })} />
              </div>

              {/* Temple Assignment */}
              <div className="md:col-span-2 border-t pt-6">
                <label className="text-sm font-bold text-slate-700 mb-4 block">Assigned Temples</label>
                <select className={inputClass} onChange={addTemple} value="">
                  <option value="">-- Add another temple --</option>
                  {allTemples.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>

                <div className="mt-4 space-y-3">
                  {formData.selectedTemples.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                      No temples assigned.
                    </div>
                  ) : (
                    formData.selectedTemples.map((temple, index) => (
                      <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Temple Name</span>
                          <span className="font-semibold text-slate-700">{temple.name}</span>
                        </div>
                        <div className="w-24 md:w-32">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Visits</label>
                          <input type="number" min="1" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                            value={temple.maxVisits} onChange={(e) => updateVisits(index, e.target.value)} />
                        </div>
                        <button type="button" onClick={() => removeTemple(index)} className="bg-red-50 text-red-500 p-3 rounded-lg hover:bg-red-100 transition-colors">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea rows="3" className={`${inputClass} resize-none`} value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">
                Cancel
              </button>
              <button disabled={submitting} type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-xl font-bold shadow-lg flex items-center gap-2">
                {submitting ? <FaSpinner className="animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}