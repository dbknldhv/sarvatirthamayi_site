import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ritualService } from "../../../services/ritualService";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function RitualList() {
  const navigate = useNavigate();

  /* ---------------- STATE ---------------- */
  const [rituals, setRituals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const undoTimeoutRef = useRef(null);

  /* ---------------- PAGINATION ---------------- */
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    loadRituals();
  }, []);

  const loadRituals = async () => {
    setLoading(true);
    try {
      const response = await ritualService.getAllRituals();
      // Handling both array response and { data: [] } structure
      const ritualData = Array.isArray(response) ? response : response?.data || [];
      setRituals(ritualData);
      setFiltered(ritualData);
    } catch (error) {
      console.error("Load Rituals Error:", error);
      toast.error("Failed to load rituals from server");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FILTER LOGIC ---------------- */
  useEffect(() => {
    const applyFilters = () => {
      let result = [...rituals];

      if (search.trim()) {
        const query = search.toLowerCase();
        result = result.filter(r => 
          (r.name && r.name.toLowerCase().includes(query)) || 
          (r.temple_name && r.temple_name.toLowerCase().includes(query)) ||
          (r.temple_id?.name && r.temple_id.name.toLowerCase().includes(query))
        );
      }

      if (status !== "all") {
        const statusNum = parseInt(status);
        result = result.filter(r => r.status === statusNum);
      }

      setFiltered(result);
      setPage(1);
    };

    applyFilters();
  }, [search, status, rituals]);

  const handleClear = () => {
    setSearch("");
    setStatus("all");
  };

  /* ---------------- DELETE & UNDO ---------------- */
  const handleDelete = async (id, name) => {
    if (!id) return;
    const itemToDelete = rituals.find(r => (r._id || r.sql_id) === id);
    if (!itemToDelete) return;

    // Optimistic UI Update
    const updatedRituals = rituals.filter(r => (r._id || r.sql_id) !== id);
    setRituals(updatedRituals);

    toast.dismiss();
    toast((t) => (
      <div className="flex items-center gap-3">
        <span><b>{name}</b> deleted.</span>
        <button
          onClick={() => {
            clearTimeout(undoTimeoutRef.current);
            setRituals(prev => [...prev, itemToDelete]);
            toast.dismiss(t.id);
          }}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-indigo-700 transition-all"
        >
          <RotateCcw size={12} /> UNDO
        </button>
      </div>
    ), { duration: 5000, position: 'bottom-right' });

    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await ritualService.deleteRitual(id);
      } catch (error) {
        setRituals(prev => [...prev, itemToDelete]);
        toast.error("Cloud sync failed. Ritual restored.");
      }
    }, 5000);
  };

  /* ---------------- PAGINATION LOGIC ---------------- */
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const start = (page - 1) * ITEMS_PER_PAGE;
  const currentItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen">
      <Toaster />

      {/* BREADCRUMB */}
      <p className="text-[11px] font-bold text-slate-400 mb-4 flex items-center gap-1 uppercase tracking-wider">
        Ritual <ChevronRight size={10} /> List
      </p>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ritual Management</h1>
          <p className="text-xs text-gray-500">Total: {filtered.length} rituals</p>
        </div>

        <button
          onClick={() => navigate("/admin/ritual/add")}
          className="flex items-center justify-center gap-2 bg-[#6366f1] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus size={18} />
          Add Ritual
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ritual or temple..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-medium"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-50 border-none px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>

          <button 
            onClick={handleClear} 
            className="flex items-center justify-center gap-1 px-4 py-2.5 bg-rose-50 text-rose-500 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
          >
            <X size={16} /> Clear
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ritual & Temple</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Devotees Booked</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-400 tracking-widest">LOADING RITUALS...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                       <Search size={40} className="mb-2" />
                       <p className="font-bold text-slate-500 uppercase text-xs tracking-widest">No results found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((r) => {
                  const ritualId = r._id || r.sql_id;
                  const templeName = r.temple_name || r.temple_id?.name || "General Ritual";

                  return (
                    <tr key={ritualId} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-700 text-sm leading-tight">{r.name || "N/A"}</p>
                        <p className="text-[10px] text-indigo-500 mt-1 font-bold uppercase tracking-tighter">
                          {templeName}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100/50 px-2 py-1 rounded-md">
                          {r.type_name || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-500 max-w-[200px]">
                        <p className="truncate text-xs font-medium italic">{r.description || "No description provided"}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full">
                          <Users size={12} className="text-indigo-600" />
                          <span className="text-xs font-black text-indigo-700">{r.booked_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 text-[9px] font-black rounded-lg border ${
                          r.status === 0 
                            ? "bg-rose-50 text-rose-500 border-rose-100" 
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                          {r.status === 0 ? "INACTIVE" : "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => ritualId && navigate(`/admin/ritual/view/${ritualId}`)}
                            className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                            title="View Details"
                          >
                            <Eye size={17} />
                          </button>
                          <button 
                            onClick={() => ritualId && navigate(`/admin/ritual/edit/${ritualId}`)}
                            className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                            title="Edit Ritual"
                          >
                            <Pencil size={17} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ritualId, r.name)}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex gap-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={`page-${i}`}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                  page === i + 1
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}