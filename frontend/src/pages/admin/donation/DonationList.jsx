import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, FaPlus, FaEye, FaEdit, FaTrash, FaTimes
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { DonationService } from '../../../services/donationService';
import { ConfirmDeleteModal, SuccessModal } from '../../../components/Alerts';

const DonationList = () => {
  const [donations, setDonations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: '' });
  const [successMsg, setSuccessMsg] = useState('');
  
  const limit = 10;

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await DonationService.getDonations({
        page: currentPage,
        limit,
        search: searchTerm,
        status: statusFilter 
      });
      setDonations(data.donations || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || 0);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const handleClear = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    try {
      await DonationService.delete(deleteModal.id);
      setDeleteModal({ open: false, id: null, title: '' });
      setSuccessMsg('Donation deleted successfully');
      fetchDonations();
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans">
      
      {/* 1. TOP FILTER BAR (Matches Image) */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search donation..."
            className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-indigo-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500 outline-none bg-white min-w-[120px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>

        <button 
          onClick={() => fetchDonations()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 font-medium"
        >
          <FaSearch className="text-gray-400" /> Search
        </button>

        <button 
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 border border-red-500 rounded-md text-sm text-red-500 hover:bg-red-50 font-medium"
        >
          <FaTimes /> Clear
        </button>

        <div className="ml-auto">
          <Link 
            to="/admin/donation/add" 
            className="bg-[#6366F1] text-white px-6 py-2 rounded-md flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all"
          >
            <FaPlus size={12}/> Add Donation
          </Link>
        </div>
      </div>

      {/* 2. TABLE (Matches Image Format) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-100">
              <th className="px-4 py-4 font-semibold">Name</th>
              <th className="px-4 py-4 font-semibold">Mobile Number</th>
              <th className="px-4 py-4 font-semibold">Address</th>
              <th className="px-4 py-4 font-semibold">Description</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!loading && donations.map((donation) => (
              <tr key={donation._id} className="group hover:bg-gray-50/50 transition-colors">
                {/* Name & Sub-text (Temple) */}
                <td className="px-4 py-5">
                  <div className="text-[14px] font-bold text-[#475569] leading-tight">{donation.name}</div>
                  <div className="text-[12px] text-gray-400 font-medium mt-0.5">{donation.temple_name || "Considine Group Temple"}</div>
                </td>

                {/* Mobile Number */}
                <td className="px-4 py-5 text-[14px] text-[#64748B] font-medium">
                  {donation.mobile_number}
                </td>

                {/* Address */}
                <td className="px-4 py-5 text-[13px] text-[#64748B] max-w-[300px] leading-relaxed">
                  {donation.address_line_1}, {donation.city}, {donation.state}, {donation.pincode}, {donation.country}
                </td>

                {/* Description */}
                <td className="px-4 py-5 text-[13px] text-[#64748B] max-w-[250px]">
                  <div className="truncate">
                    {donation.short_description || "No description provided."}
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-4 py-5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    donation.status === 1 ? 'bg-[#16A34A] text-white' : 'bg-red-500 text-white'
                  }`}>
                    {donation.status === 1 ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-5">
                  <div className="flex items-center gap-4">
                    <Link to={`/admin/donation/view/${donation._id}`} className="text-[#6366F1] hover:text-indigo-800 transition-colors">
                      <FaEye size={18}/>
                    </Link>
                    <Link to={`/admin/donation/edit/${donation._id}`} className="text-[#6366F1] hover:text-indigo-800 transition-colors">
                      <FaEdit size={18}/>
                    </Link>
                    <button 
                      onClick={() => setDeleteModal({ open: true, id: donation._id, title: donation.name })}
                      className="text-[#EF4444] hover:text-red-700 transition-colors"
                    >
                      <FaTrash size={17}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. LOADING STATE */}
      {loading && (
        <div className="py-20 text-center text-gray-300 font-medium uppercase tracking-widest animate-pulse">
          Loading Donations...
        </div>
      )}

      {/* 4. MODALS */}
      <ConfirmDeleteModal 
        isOpen={deleteModal.open}
        title={deleteModal.title}
        onClose={() => setDeleteModal({ ...deleteModal, open: false })}
        onConfirm={handleDelete} 
      />

      {successMsg && (
        <SuccessModal 
          message={successMsg} 
          onClose={() => setSuccessMsg('')} 
        />
      )}
    </div>
  );
};

export default DonationList;