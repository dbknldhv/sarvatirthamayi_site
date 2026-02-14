import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, 
  FiRotateCcw, FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight, FiInbox, FiUsers, FiMapPin
} from "react-icons/fi";
import { ritualPackageService } from "../../../services/ritualPackageService";
import toast, { Toaster } from "react-hot-toast";

const RitualPackages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page")) || 1;
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPackages();
  }, [search, status, page]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await ritualPackageService.getAll(search, status, page, itemsPerPage);
      if (res.success) {
        setPackages(res.data);
        setTotal(res.total);
      }
    } catch (err) {
      toast.error("Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  const updateParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, ...newParams });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanent Action: Delete this ritual package?")) {
      const loadingToast = toast.loading("Processing...");
      try {
        const res = await ritualPackageService.delete(id);
        if (res.success) {
          toast.success("Package removed successfully", { id: loadingToast });
          fetchPackages();
        }
      } catch (err) {
        toast.error("Deletion failed", { id: loadingToast });
      }
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => updateParams({ page: i })}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-bold transition-all duration-200 ${
            page === i 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
            : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8fafc] min-h-screen pb-24">
      <Toaster position="top-right" />

      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ritual Packages</h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
              {total} Migrated Records
            </span>
          </div>
        </div>
        <button 
          onClick={() => navigate("/admin/ritual/package/add")} 
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-xl shadow-indigo-100 transition-all active:scale-95 group"
        >
          <FiPlus size={20} className="group-hover:rotate-90 transition-transform" /> 
          Add New Package
        </button>
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center gap-4 mb-8">
        <div className="relative w-full lg:flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search by package name..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            value={search} onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
          />
        </div>
        
        <div className="flex w-full lg:w-auto gap-3">
          <select 
            value={status}
            onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
            className="flex-1 lg:w-48 pl-4 pr-10 py-3 bg-slate-50 border-transparent rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="1">Active Only</option>
            <option value="0">Inactive Only</option>
          </select>
          
          <button 
            onClick={() => updateParams({ search: "", status: "", page: 1 })} 
            className="px-5 py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 font-bold text-sm flex items-center gap-2 transition-colors border border-rose-100"
          >
            <FiRotateCcw /> <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100"></div>
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInbox className="text-slate-300" size={40} />
          </div>
          <h3 className="text-slate-900 font-bold text-lg">No records found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden lg:block bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {["Package Details", "Temple Location", "Devotees", "Pricing", "Status", "Actions"].map((th) => (
                    <th key={th} className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] text-left">
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-800 text-sm">{pkg.name}</div>
                      <div className="text-xs text-indigo-500 font-semibold mt-0.5">{pkg.ritual_id?.name || 'Ritual Service'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                        <FiMapPin className="text-slate-300" />
                        {pkg.temple_id?.name || 'Main Branch'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-slate-600 text-xs font-bold">
                        <FiUsers size={14} /> {pkg.devotees_count}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-slate-900">
                        ₹{parseFloat(pkg.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        pkg.status === 1 ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {pkg.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/admin/ritual/package/view/${pkg._id}`)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><FiEye size={18}/></button>
                        <button onClick={() => navigate(`/admin/ritual/package/edit/${pkg._id}`)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><FiEdit2 size={18}/></button>
                        <button onClick={() => handleDelete(pkg._id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><FiTrash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <div key={pkg._id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-150 ${pkg.status === 1 ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 leading-tight">{pkg.name}</h3>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">{pkg.ritual_id?.name || 'Ritual'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    pkg.status === 1 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {pkg.status === 1 ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <FiMapPin size={14} className="text-indigo-400" /> {pkg.temple_id?.name}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <FiUsers size={14} className="text-indigo-400" /> {pkg.devotees_count} Devotees
                    </div>
                    <div className="text-lg font-black text-slate-900">₹{parseFloat(pkg.price).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => navigate(`/admin/ritual/package/view/${pkg._id}`)} className="flex items-center justify-center p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><FiEye size={18}/></button>
                  <button onClick={() => navigate(`/admin/ritual/package/edit/${pkg._id}`)} className="flex items-center justify-center p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all"><FiEdit2 size={18}/></button>
                  <button onClick={() => handleDelete(pkg._id)} className="flex items-center justify-center p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"><FiTrash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- PAGINATION --- */}
      {totalPages > 0 && (
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase">
            Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => updateParams({ page: 1 })}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-indigo-300 transition-all shadow-sm"
            >
              <FiChevronsLeft size={18} />
            </button>
            <button 
              disabled={page === 1}
              onClick={() => updateParams({ page: Math.max(1, page - 1) })}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-indigo-300 transition-all shadow-sm mr-2"
            >
              <FiChevronLeft size={18} />
            </button>
            
            <div className="flex gap-2">
              {renderPaginationButtons()}
            </div>

            <button 
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-indigo-300 transition-all shadow-sm ml-2"
            >
              <FiChevronRight size={18} />
            </button>
            <button 
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: totalPages })}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-indigo-300 transition-all shadow-sm"
            >
              <FiChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RitualPackages;