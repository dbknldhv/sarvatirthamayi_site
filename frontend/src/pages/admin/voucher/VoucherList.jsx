import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { voucherService } from "../../../services/voucherService";
import { FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaChevronRight } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

export default function VoucherList() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await voucherService.getAll();
      setVouchers(data.data || []);
    } catch (error) {
      toast.error("Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this voucher?");
    if (!confirmDelete) return;

    try {
      await voucherService.delete(id);
      toast.success("Voucher deleted successfully");
      loadData();
    } catch (error) {
      toast.error("Failed to delete voucher");
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.voucher_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vouchers, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 font-bold">Loading vouchers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <Toaster />

      <nav className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
        <Link to="/admin/dashboard" className="hover:text-indigo-600">Dashboard</Link>
        <FaChevronRight size={8} />
        <span className="text-slate-600">Vouchers</span>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Voucher Plans</h1>
          <p className="text-sm text-slate-500 font-medium">{filteredVouchers.length} vouchers found</p>
        </div>

        <button
          onClick={() => navigate("/admin/voucher/add")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold"
        >
          <FaPlus size={12} /> Add Voucher
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search by title, voucher no, or code..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-400 font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">Voucher No</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Discount</th>
              <th className="px-6 py-4">Expiry</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVouchers.map((voucher) => (
              <tr key={voucher._id} className="border-t border-slate-100">
                <td className="px-6 py-4 font-bold text-slate-700">{voucher.voucher_no || "-"}</td>
                <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{voucher.code}</td>
                <td className="px-6 py-4 text-slate-700">{voucher.title}</td>
                <td className="px-6 py-4 text-slate-700">
                  {voucher.discount_type === "percentage"
                    ? `${voucher.discount_value}%`
                    : `₹${voucher.discount_value}`}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {voucher.expiry_date ? new Date(voucher.expiry_date).toLocaleDateString("en-GB") : "No expiry"}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    voucher.status === 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {voucher.status === 1 ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => navigate(`/admin/voucher/view/${voucher._id}`)} className="p-2 text-slate-500 hover:text-indigo-600">
                      <FaEye />
                    </button>
                    <button onClick={() => navigate(`/admin/voucher/edit/${voucher._id}`)} className="p-2 text-slate-500 hover:text-blue-600">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(voucher._id)} className="p-2 text-slate-500 hover:text-rose-500">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}