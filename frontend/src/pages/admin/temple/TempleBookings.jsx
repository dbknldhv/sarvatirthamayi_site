import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { templeBookingService } from "../../../services/templeBookingService";
import { 
  FiEye, FiSearch, FiChevronLeft, FiChevronRight, 
  FiChevronsLeft, FiChevronsRight, FiRotateCcw,
  FiFilter, FiCalendar, FiMapPin
} from "react-icons/fi";

const TempleBookingsList = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: "",
    bookingStatus: "",
    paymentStatus: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Use a ref to prevent unnecessary API calls during fast typing (Debounce)
  const debounceTimer = useRef(null);

  // 1. Fetch Bookings Function
  const fetchBookings = useCallback(async (currentFilters, page) => {
    setLoading(true);
    try {
      const res = await templeBookingService.getAllTempleBookings({
        page: page,
        limit: 10,
        ...currentFilters
      });
      
      if (res.success) {
        setBookings(res.templeBookings || []);
        setTotalPages(res.totalPages || 1);
        setTotalRecords(res.total || 0);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Trigger fetch when filters or page change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Debounce the search input specifically
    debounceTimer.current = setTimeout(() => {
      fetchBookings(filters, currentPage);
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [filters, currentPage, fetchBookings]);

  // Handle Input Changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const resetFilters = () => {
    setFilters({ search: "", bookingStatus: "", paymentStatus: "" });
    setCurrentPage(1);
  };

  // Pagination Logic
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusStyle = (type, val) => {
    const v = Number(val);
    if (type === 'booking') {
      if (v === 2) return "bg-green-100 text-green-700 border-green-200";
      if (v === 3) return "bg-red-100 text-red-700 border-red-200";
      return "bg-orange-100 text-orange-700 border-orange-200";
    }
    if (v === 2) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (v === 3) return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Temple Bookings</h1>
    {/* Dynamic Total Count Display */}
    <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md inline-block mt-1">
      Total Bookings: <span className="font-bold">{totalRecords}</span>
    </p>        </div>
        <button 
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="md:hidden flex items-center justify-center gap-2 bg-white border border-gray-200 p-2 rounded-lg text-sm font-semibold text-gray-600"
        >
          <FiFilter /> {showMobileFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Filter Bar - Temple Dropdown Removed */}
      <div className={`${showMobileFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row bg-white p-4 rounded-xl shadow-sm gap-3 mb-6 items-center border border-gray-100 transition-all`}>
        <div className="relative w-full md:flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            type="text" 
            placeholder="Search devotee or phone..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" 
          />
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <select name="bookingStatus" value={filters.bookingStatus} onChange={handleFilterChange} className="flex-1 border border-gray-200 p-2 rounded-lg text-sm text-gray-600 bg-white">
            <option value="">Booking Status</option>
            <option value="1">Pending</option>
            <option value="2">Confirmed</option>
            <option value="3">Cancelled</option>
          </select>

          <select name="paymentStatus" value={filters.paymentStatus} onChange={handleFilterChange} className="flex-1 border border-gray-200 p-2 rounded-lg text-sm text-gray-600 bg-white">
            <option value="">Payment Status</option>
            <option value="1">Pending</option>
            <option value="2">Paid</option>
            <option value="3">Failed</option>
          </select>
        </div>

        <button onClick={resetFilters} className="w-full md:w-auto border border-red-100 text-red-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
          <FiRotateCcw /> Clear
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Devotee</th>
                <th className="px-6 py-4">Temple</th>
                <th className="px-6 py-4">Date & Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                 <tr><td colSpan="5" className="text-center py-20 text-gray-400 font-medium text-sm">Fetching Data...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-20 text-gray-400 font-medium text-sm">No records matching your filters.</td></tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b._id} className="text-sm hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{b.devotees_name}</div>
                      <div className="text-[11px] text-gray-400">{b.whatsapp_number}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium uppercase text-xs">
                      {/* FIXED: Directly access populated temple name */}
                      {b.temple_id?.name || "Unknown Temple"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 font-medium text-xs">{new Date(b.date).toLocaleDateString('en-GB')}</div>
                      <div className="text-indigo-600 font-bold">₹{b.paid_amount}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle('booking', b.booking_status)}`}>
                          {b.booking_status === 2 ? 'CONFIRMED' : b.booking_status === 3 ? 'CANCELLED' : 'PENDING'}
                        </span>
                        <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle('payment', b.payment_status)}`}>
                          {b.payment_status === 2 ? 'PAID' : b.payment_status === 3 ? 'FAILED' : 'PENDING'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => navigate(`/admin/temple-booking/view/${b._id}`)} className="p-2 bg-gray-50 text-indigo-500 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <FiEye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : bookings.map((b) => (
            <div key={b._id} className="p-4 space-y-3 bg-white active:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                    {b.devotees_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{b.devotees_name}</h3>
                    <p className="text-[11px] text-gray-400 font-medium">{b.whatsapp_number}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/admin/temple-booking/view/${b._id}`)} className="p-2 text-indigo-500 bg-indigo-50 rounded-lg">
                  <FiEye size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="flex items-center gap-2 text-gray-500 bg-gray-50 p-2 rounded-lg">
                  <FiMapPin className="text-indigo-400" />
                  <span className="truncate">{b.temple_id?.name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 bg-gray-50 p-2 rounded-lg">
                  <FiCalendar className="text-indigo-400" />
                  <span>{new Date(b.date).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-lg font-black text-gray-800">₹{b.paid_amount}</div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusStyle('booking', b.booking_status)}`}>
                    {b.booking_status === 2 ? 'CONFIRMED' : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 border-t border-gray-100">
          <div className="text-[12px] text-gray-500 font-medium order-2 sm:order-1">
            Showing <span className="text-gray-800 font-bold">{bookings.length}</span> of <span className="text-gray-800 font-bold">{totalRecords}</span> records
          </div>
          
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <button 
              onClick={() => handlePageChange(1)} 
              disabled={currentPage === 1 || loading} 
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all hover:shadow-sm"
            >
              <FiChevronsLeft size={16} />
            </button>
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1 || loading} 
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all hover:shadow-sm"
            >
              <FiChevronLeft size={16} />
            </button>

            <div className="px-4 text-xs font-bold text-gray-600 flex items-center gap-1">
              Page <span className="text-indigo-600">{currentPage}</span> of <span>{totalPages}</span>
            </div>

            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages || loading} 
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all hover:shadow-sm"
            >
              <FiChevronRight size={16} />
            </button>
            <button 
              onClick={() => handlePageChange(totalPages)} 
              disabled={currentPage === totalPages || loading} 
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 disabled:opacity-30 transition-all hover:shadow-sm"
            >
              <FiChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempleBookingsList;