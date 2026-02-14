import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ritualTypesService } from "../../../../services/ritualTypesService";
import { toast } from "react-hot-toast";
import { Loader2, ArrowLeft, Save } from "lucide-react";

export default function RitualTypesEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  // States
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true); // Loading initial data
  const [isSubmitting, setIsSubmitting] = useState(false); // Saving data

  useEffect(() => {
    fetchRitualType();
  }, [id]);

  const fetchRitualType = async () => {
    try {
      setLoading(true);
      const res = await ritualTypesService.getRitualTypeById(id);
      if (res.success) {
        setName(res.data.name);
        setIsActive(res.data.status === 1);
      }
    } catch (error) {
      toast.error("Failed to load ritual type data");
      navigate("/admin/ritual/type");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");

    setIsSubmitting(true);
    try {
      await ritualTypesService.updateRitualType(id, {
        name: name.trim(),
        status: isActive ? 1 : 0,
      });
      toast.success("Ritual type updated successfully!");
      navigate("/admin/ritual/type");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
        <p className="text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Navigation Header */}
      <button
        onClick={() => navigate("/admin/ritual/type")}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> Back to List
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800">Edit Ritual Type</h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-bold">
            Update category details for rituals
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
              Ritual Type Name *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-700"
              placeholder="e.g. Abhishekam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Status Toggle */}
          <div className="p-4 bg-slate-50 rounded-2xl w-fit flex items-center gap-4 border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Status
              </span>
              <span className="text-sm font-bold text-slate-600">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              disabled={isSubmitting}
              className={`w-14 h-7 rounded-full transition-all relative ${
                isActive ? "bg-emerald-500 shadow-lg shadow-emerald-100" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  isActive ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button
              type="button"
              onClick={() => navigate("/admin/ritual/type")}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Updating...
                </>
              ) : (
                <>
                  <Save size={18} /> Update Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}