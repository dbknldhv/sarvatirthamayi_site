import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ritualTypesService } from "../../../services/ritualTypesService";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
  RotateCcw,
  Inbox
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function RitualTypes() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const undoTimeoutRef = useRef(null);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const response = await ritualTypesService.getAllRitualTypes();
      setTypes(response.data || []);
    } catch (error) {
      toast.error("Failed to load ritual types");
    } finally {
      setLoading(false);
    }
  };

  // Memoized filter for performance
  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "all" || t.status === parseInt(status);
      return matchesSearch && matchesStatus;
    });
  }, [search, status, types]);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
  };

  const handleDelete = async (id, name) => {
    const itemToDelete = types.find((t) => t._id === id || t.sql_id === id);
    if (!itemToDelete) return;

    // Optimistic UI Update
    setTypes((prev) => prev.filter((t) => t._id !== id && t.sql_id !== id));

    toast((t) => (
      <div className="flex items-center gap-3 font-medium text-sm">
        <span>Type <b>{name}</b> deleted.</span>
        <button
          onClick={() => {
            clearTimeout(undoTimeoutRef.current);
            setTypes((prev) => [...prev, itemToDelete].sort((a, b) => a.name.localeCompare(b.name)));
            toast.dismiss(t.id);
          }}
          className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest flex items-center gap-1 hover:bg-indigo-700 transition-colors"
        >
          <RotateCcw size={12} /> UNDO
        </button>
      </div>
    ), { duration: 5000, position: 'bottom-right' });

    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await ritualTypesService.deleteRitualType(id);
      } catch (error) {
        setTypes((prev) => [...prev, itemToDelete]);
        toast.error(`Server error: Could not delete ${name}`);
      }
    }, 5000);
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen">
      <Toaster />
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">
        <span className="hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => navigate('/admin')}>Dashboard</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600">Ritual Types</span>
      </div>

      {/* Header & Filter Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 transition-all hover:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="relative flex-1 max-w-md min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search ritual type name..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>

              <button 
                onClick={handleResetFilters} 
                className="p-3 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100"
                title="Clear Filters"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/ritual/type/add")}
            className="flex items-center justify-center gap-2 bg-[#6366f1] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Plus size={20} /> Add Ritual Type
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Ritual Name</th>
              <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="3" className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-slate-400 font-bold text-sm tracking-wide">Fetching Ritual Types...</span>
                  </div>
                </td>
              </tr>
            ) : filteredTypes.length > 0 ? (
              filteredTypes.map((type) => (
                <tr key={type._id || type.sql_id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-700">{type.name}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black tracking-wider ${
                      type.status === 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                      {type.status === 1 ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => navigate(`/admin/ritual/type/view/${type._id || type.sql_id}`)} 
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="View Details"
                      >
                        <Eye size={18}/>
                      </button>
                      <button 
                        onClick={() => navigate(`/admin/ritual/type/edit/${type._id || type.sql_id}`)} 
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit Type"
                      >
                        <Pencil size={18}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(type._id || type.sql_id, type.name)} 
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Type"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              /* NO RECORDS FOUND STATE */
              <tr>
                <td colSpan="3" className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                      <Inbox size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-slate-700 font-bold text-lg mb-1">No ritual types found</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      We couldn't find any results matching "{status === 'all' ? search : `${status === '1' ? 'Active' : 'Inactive'} ${search}`}".
                    </p>
                    <button 
                      onClick={handleResetFilters}
                      className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer Info */}
      <div className="mt-4 flex justify-between items-center px-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Showing {filteredTypes.length} of {types.length} Categories
        </p>
      </div>
    </div>
  );
}