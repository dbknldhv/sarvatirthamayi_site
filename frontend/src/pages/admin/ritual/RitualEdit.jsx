import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ritualService } from "../../../services/ritualService";
import { ChevronRight } from "lucide-react";
import { toast, Toaster } from 'react-hot-toast';

const RitualEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [temples, setTemples] = useState([]);
  const [ritualTypes, setRitualTypes] = useState([]);

  const [formData, setFormData] = useState({
    temple_id: "",
    name: "",
    ritual_type_id: "",
    description: "",
    status: 1,
    sequence: 0,
    image: null
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const [templeData, typeData, ritualData] = await Promise.all([
          ritualService.getTemples(),
          ritualService.getRitualTypes(),
          ritualService.getRitualById(id)
        ]);
        setTemples(templeData);
        setRitualTypes(typeData);
        
        // Populate form with existing data
        setFormData({
          temple_id: ritualData.temple_id?._id || ritualData.temple_id || "",
          name: ritualData.name || "",
          ritual_type_id: ritualData.ritual_type_id?._id || ritualData.ritual_type_id || "",
          description: ritualData.description || "",
          status: ritualData.status,
          sequence: ritualData.sequence || 0,
          image: null 
        });
        if (ritualData.image) setImagePreview(ritualData.image);
      } catch (error) {
        toast.error("Failed to load ritual data");
      }
    };
    initData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) data.append(key, formData[key]);
      });
      await ritualService.updateRitual(id, data);
      toast.success("Updated successfully!");
      setTimeout(() => navigate("/admin/ritual"), 1500);
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-600">
      <Toaster />
      
      {/* BREADCRUMB */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-6">
        <span className="cursor-pointer hover:text-indigo-600" onClick={() => navigate("/admin/ritual")}>Rituals</span>
        <ChevronRight size={12} />
        <span className="text-slate-600 font-bold">Edit</span>
      </nav>

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-700">Edit Ritual</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-6">
            
            {/* TEMPLE - FULL WIDTH */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Temple</label>
              <select
                name="temple_id"
                value={formData.temple_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm text-slate-700"
              >
                <option value="">Select Temple</option>
                {temples.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            {/* RITUAL NAME & SELECT TYPE - 2 COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ritual Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter ritual name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Select Type</label>
                <select
                  name="ritual_type_id"
                  value={formData.ritual_type_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  <option value="">Select Ritual Type</option>
                  {ritualTypes.map(type => <option key={type._id} value={type._id}>{type.name}</option>)}
                </select>
              </div>
            </div>

            {/* DESCRIPTION - FULL WIDTH */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm resize-none"
              ></textarea>
            </div>

            {/* STATUS & SEQUENCE - 2 COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Sequence</label>
                <input
                  type="number"
                  name="sequence"
                  value={formData.sequence}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* RITUAL IMAGE */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ritual Image</label>
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-lg p-1"
                />
                {imagePreview && (
                  <div className="w-24 h-24 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 pt-10">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Ritual"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RitualEdit;