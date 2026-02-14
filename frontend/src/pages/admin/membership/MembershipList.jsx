import React, { useState, useEffect, useMemo, useRef } from "react";
import { membershipService } from "../../../services/membershipService";
import { 
  FaEye, FaEdit, FaTrash, FaPlus, FaSearch, 
  FaUndo, FaInbox, FaTimes, FaChevronRight 
} from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";

export default function MembershipList() {
  const navigate = useNavigate();
  const undoTimeoutRef = useRef(null);

  // ================= STATE =================
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // ================= API =================
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await membershipService.getInitialData();
      // Adjusting to ensure we handle potential different API response shapes
      setMemberships(data.memberships || data || []);
    } catch (err) {
      console.error("Error loading memberships", err);
      toast.error("Failed to load memberships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ================= ACTIONS =================
  const handleDelete = async (id, name) => {
    const itemToDelete = memberships.find((m) => m._id === id);
    if (!itemToDelete) return;

    // 1. Optimistic UI Update
    setMemberships((prev) => prev.filter((m) => m._id !== id));

    // 2. Show Undo Toast
    toast((t) => (
      <div className="flex items-center gap-3">
        <span>Plan <b>{name}</b> deleted.</span>
        <button
          onClick={() => {
            clearTimeout(undoTimeoutRef.current);
            setMemberships((prev) => [...prev, itemToDelete]);
            toast.dismiss(t.id);
          }}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
        >
          <FaUndo size={10} /> UNDO
        </button>
      </div>
    ), { duration: 5000, position: 'bottom-right' });

    // 3. Set Timeout for Server Deletion
    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await membershipService.delete(id);
      } catch (error) {
        setMemberships((prev) => [...prev, itemToDelete]);
        toast.error("Could not delete from server");
      }
    }, 5000);
  };

  const filteredMemberships = useMemo(() => {
    return memberships.filter((card) => {
      const matchesSearch = card.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const statusText = card.status === 1 ? "Active" : "Inactive";
      const matchesStatus = statusFilter === "All Status" || statusText === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, memberships]);

  // ================= RENDER HELPERS =================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-600" />
        <p className="text-slate-500 font-bold animate-pulse">Loading Memberships...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans">
      <Toaster />

      {/* BREADCRUMB */}
      <nav className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
        <Link to="/admin/dashboard" className="hover:text-indigo-600">Dashboard</Link>
        <FaChevronRight size={8} />
        <span className="text-slate-600">Membership Cards</span>
      </nav>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Membership Cards</h1>
          <p className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block mt-1">
            {filteredMemberships.length === memberships.length 
              ? `Showing all ${memberships.length} plans` 
              : `Found ${filteredMemberships.length} plans (filtered)`}
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/membership/add")}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold transition-all active:scale-95"
        >
          <FaPlus size={12} /> Add Membership
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search membership by name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-600 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("All Status"); }}
              className="px-4 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
              title="Clear Filters"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {filteredMemberships.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* DESKTOP TABLE */}
          <div className="hidden md:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Card Plan</th>
                  <th className="px-8 py-5">Pricing</th>
                  <th className="px-8 py-5">Duration & Usage</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMemberships.map((card) => (
                  <tr key={card._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-800">{card.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[250px] mt-0.5">
                        {card.description || "No description provided"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-lg font-black text-slate-700">₹{card.price}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-slate-600">
                        {card.duration} {card.duration_type === 1 ? "Months" : "Years"}
                      </div>
                      <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">
                        {card.visits} Visits Allowed
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-lg tracking-wider inline-block ${
                        card.status === 1 ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {card.status === 1 ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/admin/membership/view/${card._id}`)} 
                          className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <FaEye size={16} />
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/membership/edit/${card._id}`)} 
                          className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <FaEdit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(card._id, card.name)} 
                          className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE LIST */}
          <div className="grid gap-0 md:hidden divide-y divide-slate-100">
            {filteredMemberships.map((card) => (
              <div key={card._id} className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{card.name}</h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-black tracking-widest uppercase ${
                      card.status === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {card.status === 1 ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xl font-black text-indigo-600 font-mono">₹{card.price}</div>
                </div>

                <div className="flex gap-6 py-3 px-4 bg-slate-50 rounded-xl mb-4">
                  <div className="text-xs">
                    <p className="text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Duration</p>
                    <p className="font-bold text-slate-700">{card.duration} {card.duration_type === 1 ? "Mo" : "Yr"}</p>
                  </div>
                  <div className="text-xs">
                    <p className="text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Visits</p>
                    <p className="font-bold text-slate-700">{card.visits} Total</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400 italic truncate max-w-[150px]">
                    {card.description || "No description"}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/admin/membership/view/${card._id}`)} className="p-3 text-slate-500 bg-slate-50 rounded-xl active:bg-slate-100"><FaEye size={14}/></button>
                    <button onClick={() => navigate(`/admin/membership/edit/${card._id}`)} className="p-3 text-blue-500 bg-slate-50 rounded-xl active:bg-blue-100"><FaEdit size={14}/></button>
                    <button onClick={() => handleDelete(card._id, card.name)} className="p-3 text-rose-500 bg-slate-50 rounded-xl active:bg-rose-100"><FaTrash size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* NO RECORDS FOUND */
        <div className="bg-white rounded-3xl p-16 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-50 p-8 rounded-full mb-6">
            <FaInbox size={48} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">No memberships found</h3>
          <p className="text-slate-400 max-w-xs mb-8 text-sm font-medium">We couldn't find any membership plans matching your current search or status filter.</p>
          <button
            onClick={() => { setSearchTerm(""); setStatusFilter("All Status"); }}
            className="bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}