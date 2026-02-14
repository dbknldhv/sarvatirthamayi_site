import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ritualTypesService } from "../../../../services/ritualTypesService";
import { toast } from "react-hot-toast";
import { Loader2, ArrowLeft } from "lucide-react"; // Added icons

export default function RitualTypesAdd() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // New loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter a name");

    setIsSubmitting(true);
    try {
      await ritualTypesService.createRitualType({ 
        name: name.trim(), 
        status: isActive ? 1 : 0 
      });
      toast.success("Ritual Type created successfully!");
      navigate("/admin/ritual/type");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create ritual type");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Breadcrumb / Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> Back to List
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-4xl">
        <h2 className="text-xl font-bold text-slate-800 mb-8">Create Ritual Type</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">
              Ritual Type Name *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="e.g. Abhishekam, Pooja, Homa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              disabled={isSubmitting}
              className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-bold text-slate-600">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-50">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Saving...
                </>
              ) : (
                "Create Ritual Type"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}