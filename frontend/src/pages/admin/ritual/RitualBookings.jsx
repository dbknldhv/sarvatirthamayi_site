import React, { useState, useEffect } from 'react';
import { ritualBookingService } from '../../../services/ritualBookingService';
import { Eye, Search, X, ChevronLeft, ChevronRight, Calendar, User, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RitualBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bStatus, setBStatus] = useState("all");
  const [pStatus, setPStatus] = useState("all");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await ritualBookingService.getAllRitualBookings();
    const data = res.data || [];
    setBookings(data);
    setFiltered(data);
  };

  // Refactored Filtering Logic
  useEffect(() => {
    const result = bookings.filter((item) => {
      const matchesSearch = 
        item.devotees_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.booking_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBStatus = bStatus === "all" || item.booking_status?.toString() === bStatus;
      const matchesPStatus = pStatus === "all" || item.payment_status?.toString() === pStatus;

      return matchesSearch && matchesBStatus && matchesPStatus;
    });

    setFiltered(result);
    setCurrentPage(1);
  }, [searchTerm, bStatus, pStatus, bookings]);

  const handleClear = () => {
    setSearchTerm("");
    setBStatus("all");
    setPStatus("all");
    setCurrentPage(1);
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Status Badge Helper
  const getStatusBadge = (status, type) => {
    const configs = {
      booking: {
        "1": { label: "PENDING", class: "bg-yellow-100 text-yellow-700" },
        "2": { label: "CONFIRMED", class: "bg-blue-100 text-blue-700" },
        "3": { label: "CANCELLED", class: "bg-red-100 text-red-700" },
      },
      payment: {
        "1": { label: "PENDING", class: "bg-yellow-100 text-yellow-700" },
        "2": { label: "PAID", class: "bg-green-100 text-green-700" },
        "3": { label: "FAILED", class: "bg-red-100 text-red-700" },
      }
    };
    const config = configs[type][status?.toString()] || { label: "UNKNOWN", class: "bg-gray-100 text-gray-600" };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.class}`}>{config.label}</span>;
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section with Total Counter */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ritual Bookings</h1>
            <p className="text-sm text-gray-500">Manage and monitor ritual appointments</p>
          </div>
          <div className="bg-blue-600 px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 flex items-center gap-4 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Total Bookings</p>
              <p className="text-2xl font-bold leading-none">{filtered.length}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-grow min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
              placeholder="Search by devotee name or Booking ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none cursor-pointer hover:border-blue-300 transition-colors" value={bStatus} onChange={(e) => setBStatus(e.target.value)}>
            <option value="all">All Booking Status</option>
            <option value="1">Pending</option>
            <option value="2">Confirmed</option>
            <option value="3">Cancelled</option>
          </select>

          <select className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none cursor-pointer hover:border-blue-300 transition-colors" value={pStatus} onChange={(e) => setPStatus(e.target.value)}>
            <option value="all">All Payment Status</option>
            <option value="1">Pending</option>
            <option value="2">Paid</option>
            <option value="3">Failed</option>
          </select>

          <button onClick={handleClear} className="bg-white border border-red-200 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
            <X size={18} /> <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-400 font-bold tracking-wider">
              <tr>
                <th className="p-4">Devotee & ID</th>
                <th className="p-4">Ritual Details</th>
                <th className="p-4">Package & Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {currentItems.length > 0 ? currentItems.map((item) => (
                <tr key={item._id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="p-4">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.devotees_name}</div>
                    <div className="text-gray-400 text-xs font-normal tracking-tight">ID: {item.booking_id}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-700">{item.ritual_id?.name}</div>
                    <div className="text-gray-500 text-xs">{item.temple_id?.name}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-600 font-medium">{item.ritual_package_id?.name}</div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                      <Calendar size={12} />
                      {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-gray-800 italic">₹{item.paid_amount?.toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-400 font-bold w-12">PAY:</span>
                        {getStatusBadge(item.payment_status, 'payment')}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gray-400 font-bold w-12">BOOK:</span>
                        {getStatusBadge(item.booking_status, 'booking')}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => navigate(`/admin/ritual-bookings/${item._id}`)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-all">
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="p-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-gray-100 p-4 rounded-full text-gray-400"><Search size={32}/></div>
                      <p className="text-gray-500 font-medium">No results found for your selection</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden space-y-4">
          {currentItems.map((item) => (
            <div key={item._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform" onClick={() => navigate(`/admin/ritual-bookings/${item._id}`)}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{item.devotees_name}</h3>
                  <p className="text-xs text-blue-600 font-bold tracking-wide uppercase mt-0.5">{item.ritual_id?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 text-lg">₹{item.paid_amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{item.booking_id}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                   <Calendar size={14} className="text-gray-400"/>
                   {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                   <User size={14} className="text-gray-400"/>
                   View Details
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {getStatusBadge(item.payment_status, 'payment')}
                  {getStatusBadge(item.booking_status, 'booking')}
                </div>
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                  <Eye size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Professional Pagination */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">
            Showing <span className="text-blue-600">{indexOfFirstItem + 1}</span> to <span className="text-blue-600">{Math.min(indexOfLastItem, filtered.length)}</span> of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1.5">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex gap-1 hidden sm:flex">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 text-xs font-bold rounded-lg transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'border border-gray-100 hover:bg-gray-50 text-gray-500'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RitualBookings;