import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { templeService } from "../../../services/templeService";
import { 
  Search, X, Plus, Eye, Edit2, Trash2, Loader2, 
  ChevronLeft, ChevronRight, MapPin, Phone, Clock, 
  Landmark, Mail, IndianRupee, Gift, Percent, ToggleLeft, ToggleRight
} from "lucide-react";

export default function TempleList() {
  const navigate = useNavigate();
  const [temples, setTemples] = useState([]);
  const [filteredTemples, setFilteredTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchTemples(); }, []);

  useEffect(() => {
    let result = temples;
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(t => 
        t.name?.toLowerCase().includes(query) || 
        (t.city_name || t.city || "").toLowerCase().includes(query) ||
        (t.state_name || (typeof t.state === 'object' ? t.state?.name : t.state) || "").toLowerCase().includes(query)
      );
    }
    if (statusFilter !== "all") {
      const targetStatus = statusFilter === "active" ? 1 : 0;
      result = result.filter(t => t.status === targetStatus);
    }
    setFilteredTemples(result);
    setCurrentPage(1);
  }, [search, statusFilter, temples]);

  const fetchTemples = async () => {
    setLoading(true);
    try {
      const response = await templeService.getTemples();
      const data = response?.temples || response;
      setTemples(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: QUICK TOGGLE FUNCTION ---
  const handleToggleFree = async (id, currentStatus) => {
    try {
      // Assuming your templeService has a patch/update method
      await templeService.updateTemple(id, { is_free_today: !currentStatus });
      // Local State Update for UI speed
      setTemples(prev => prev.map(t => t._id === id ? { ...t, is_free_today: !currentStatus } : t));
    } catch (err) {
      alert("Failed to update pricing status.");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await templeService.deleteTemple(id);
        setTemples(prev => prev.filter(t => t._id !== id));
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const totalPages = Math.ceil(filteredTemples.length / itemsPerPage);
  const currentItems = filteredTemples.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f1] via-[#F1F5F9] to-[#eef2ff] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">
              <Landmark size={14} /> Admin Portal
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Temple Directory</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Manage and monitor {filteredTemples.length} religious sites</p>
          </div>
          <button 
            onClick={() => navigate("/admin/temple/add")}
            className="flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-200 active:scale-95 w-full md:w-auto"
          >
            <Plus size={20} /> Add New Temple
          </button>
        </div>

        {/* --- SEARCH & FILTER --- */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 mb-8 border border-white shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, city or state..."
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button 
              onClick={() => {setSearch(""); setStatusFilter("all");}} 
              className="p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
            <p className="mt-4 text-slate-400 font-black text-xs uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : currentItems.length > 0 ? (
          <>
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-50 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-6">Temple & Location</th>
                    <th className="px-8 py-6">Pricing & Discounts</th>
                    <th className="px-8 py-6 text-center">Free Entry</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-8 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentItems.map((temple) => (
                    <tr key={temple._id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 text-base">{temple.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                          <MapPin size={12} className="text-emerald-500" />
                          {typeof temple.city_id === 'object' ? temple.city_id?.name : (temple.city_name || temple.city || "N/A")}
                          {', '}
                          {typeof temple.state_id === 'object' ? temple.state_id?.name : (temple.state_name || temple.state || "N/A")}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <IndianRupee size={14} className="text-emerald-500" />
                          {temple.visit_price || "0"}
                        </div>
                        {/* DISCOUNT INDICATORS */}
                        <div className="flex gap-2 mt-2">
                            {temple.is_free_today ? (
                                <span className="flex items-center gap-1 text-[9px] font-black bg-green-500 text-white px-2 py-0.5 rounded-md">
                                    <Gift size={10} /> FREE
                                </span>
                            ) : temple.is_discount_active ? (
                                <span className="flex items-center gap-1 text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-md">
                                    <Percent size={10} /> {temple.member_discount_percentage}% OFF
                                </span>
                            ) : (
                                <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md">
                                    STANDARD
                                </span>
                            )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                            <button 
                                onClick={() => handleToggleFree(temple._id, temple.is_free_today)}
                                className={`transition-all ${temple.is_free_today ? 'text-green-500' : 'text-slate-300'} hover:scale-110 active:scale-95`}
                                title={temple.is_free_today ? "Disable Free Entry" : "Enable Free Entry"}
                            >
                                {temple.is_free_today ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <StatusBadge status={temple.status} />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end gap-2">
                          <ActionButton icon={<Eye size={16} />} color="text-indigo-500 bg-indigo-50" onClick={() => navigate(`/admin/temple/view/${temple._id}`)} />
                          <ActionButton icon={<Edit2 size={16} />} color="text-amber-500 bg-amber-50" onClick={() => navigate(`/admin/temple/edit/${temple._id}`)} />
                          <ActionButton icon={<Trash2 size={16} />} color="text-red-500 bg-red-50" onClick={() => handleDelete(temple._id, temple.name)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentItems.map((temple) => (
                <div key={temple._id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{temple.name}</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">{temple.city_name || 'Location N/A'}</p>
                    </div>
                    <StatusBadge status={temple.status} />
                  </div>
                  
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl mb-4">
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Entry Fee</p>
                        <p className="text-sm font-black text-slate-700">₹{temple.visit_price}</p>
                    </div>
                    <button 
                        onClick={() => handleToggleFree(temple._id, temple.is_free_today)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                            temple.is_free_today ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-white text-slate-400 border border-slate-100'
                        }`}
                    >
                        {temple.is_free_today ? <Gift size={12}/> : null}
                        {temple.is_free_today ? 'Free' : 'Set Free'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                    <button onClick={() => navigate(`/admin/temple/view/${temple._id}`)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50 text-indigo-600 transition-active active:scale-90">
                      <Eye size={18} />
                      <span className="text-[10px] font-black mt-1 uppercase">View</span>
                    </button>
                    <button onClick={() => navigate(`/admin/temple/edit/${temple._id}`)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 text-amber-600 transition-active active:scale-90">
                      <Edit2 size={18} />
                      <span className="text-[10px] font-black mt-1 uppercase">Edit</span>
                    </button>
                    <button onClick={() => handleDelete(temple._id, temple.name)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-red-50 text-red-600 transition-active active:scale-90">
                      <Trash2 size={18} />
                      <span className="text-[10px] font-black mt-1 uppercase">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* --- PAGINATION --- */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
              </p>
              <div className="flex items-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[2.5rem] py-24 text-center border border-slate-100 shadow-xl">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 mb-4">
               <Search size={40} />
             </div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">No Temples Found</h3>
             <p className="text-slate-400 text-sm mt-2">Try changing your search keywords or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

const StatusBadge = ({ status }) => (
  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
    status === 1 
    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
    : "bg-slate-50 text-slate-400 border-slate-100"
  }`}>
    {status === 1 ? "Active" : "Inactive"}
  </span>
);

const ActionButton = ({ icon, color, onClick }) => (
  <button 
    onClick={onClick} 
    className={`p-3 rounded-2xl transition-all active:scale-90 hover:shadow-md border border-transparent ${color}`}
  >
    {icon}
  </button>
);