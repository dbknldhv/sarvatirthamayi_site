import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ritualService } from "../../../services/ritualService";
import { ChevronRight, Upload, X, ArrowLeft } from "lucide-react";
import { toast, Toaster } from 'react-hot-toast';

const AddRitual = () => {
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
    const fetchLookups = async () => {
      try {
        const [templeData, typeData] = await Promise.all([
          ritualService.getTemples(),
          ritualService.getRitualTypes()
        ]);
        
        // Ensure we handle the data even if it's nested differently
        setTemples(Array.isArray(templeData) ? templeData : []);
        setRitualTypes(Array.isArray(typeData) ? typeData : []);
      } catch (error) {
        console.error("Lookup fetch error:", error);
        toast.error("Failed to load selection data");
      }
    };
    fetchLookups();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Keep values as strings for the form, handle conversion on submit if needed
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
    
    // VALIDATION: Ensure IDs are selected
    if (!formData.temple_id || !formData.ritual_type_id) {
      return toast.error("Please select a Temple and Ritual Type");
    }

    setLoading(true);
    try {
      const data = new FormData();
      
      // Append all fields to FormData
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });

      await ritualService.createRitual(data);
      toast.success("Ritual created successfully!");
      setTimeout(() => navigate("/admin/ritual"), 1500);
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error(error.response?.data?.message || "Failed to create ritual");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-600">
      <Toaster position="top-right" />
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-6">
        <span className="cursor-pointer hover:text-indigo-600" onClick={() => navigate("/admin/ritual")}>Rituals</span>
        <ChevronRight size={12} />
        <span className="text-slate-600 font-bold">Create</span>
      </nav>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-700">Add New Ritual</h2>
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Temple Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Temple</label>
            <select 
              name="temple_id" 
              required 
              value={formData.temple_id}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              onChange={handleInputChange}
            >
              <option value="">Select Temple</option>
              {temples.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ritual Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Ritual Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder="Enter ritual name"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none" 
                onChange={handleInputChange} 
              />
            </div>

            {/* Ritual Type Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Ritual Type</label>
              <select 
                name="ritual_type_id" 
                required
                value={formData.ritual_type_id}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                onChange={handleInputChange}
              >
                <option value="">Select Type</option>
                {ritualTypes.map(type => (
                  <option key={type._id} value={type._id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Description</label>
            <textarea 
              name="description" 
              rows="3" 
              placeholder="Describe the ritual..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none" 
              onChange={handleInputChange}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
              <select name="status" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" onChange={handleInputChange}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Sequence</label>
              <input type="number" name="sequence" defaultValue="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm" onChange={handleInputChange} />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Image</label>
            <div className="flex items-center gap-4">
              <label className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 text-sm flex items-center gap-2 transition-colors">
                <Upload size={16} /> Choose File
                <input type="file" hidden onChange={handleImageChange} accept="image/*" />
              </label>
              {imagePreview && (
                <div className="relative w-20 h-20 border rounded-lg overflow-hidden group">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button" 
                    onClick={() => {setImagePreview(null); setFormData(f => ({...f, image: null}))}} 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <X size={16}/>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-50">
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-[#6366f1] text-white px-10 py-2.5 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 min-w-[160px]"
            >
              {loading ? "Saving..." : "Create Ritual"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRitual;