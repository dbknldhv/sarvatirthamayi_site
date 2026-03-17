import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaChevronRight, FaSpinner } from "react-icons/fa";
import { voucherService } from "../../../services/voucherService";

export default function VoucherView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVoucher = async () => {
      try {
        const res = await voucherService.getById(id);
        setVoucher(res.data || null);
      } catch (error) {
        console.error("Failed to fetch voucher:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVoucher();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
        <FaSpinner className="animate-spin text-indigo-600 text-3xl mb-4" />
        <p className="text-slate-400 italic">Loading voucher details...</p>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="p-10 text-center">
        <p className="text-rose-500 font-bold">Voucher not found.</p>
        <Link to="/admin/voucher" className="mt-4 text-indigo-600 underline block">
          Go Back
        </Link>
      </div>
    );
  }

  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block";
  const valueClass = "text-[14px] font-medium text-slate-700 block";

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <nav className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6">
          <Link to="/admin/voucher" className="hover:text-indigo-600 transition-colors">
            Vouchers
          </Link>
          <FaChevronRight size={8} />
          <span className="text-slate-600">View</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">Voucher Details</h2>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className={labelClass}>Voucher Number</label>
                <span className={valueClass}>{voucher.voucher_no || "-"}</span>
              </div>

              <div>
                <label className={labelClass}>Voucher Code</label>
                <span className={`${valueClass} font-mono text-indigo-600`}>{voucher.code}</span>
              </div>

              <div>
                <label className={labelClass}>Title</label>
                <span className={valueClass}>{voucher.title}</span>
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <span
                  className={`inline-block px-3 py-1 rounded text-[10px] font-bold uppercase ${
                    voucher.status === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {voucher.status === 1 ? "Active" : "Inactive"}
                </span>
              </div>

              <div>
                <label className={labelClass}>Discount Type</label>
                <span className={valueClass}>{voucher.discount_type}</span>
              </div>

              <div>
                <label className={labelClass}>Discount Value</label>
                <span className={valueClass}>
                  {voucher.discount_type === "percentage"
                    ? `${voucher.discount_value}%`
                    : `₹${voucher.discount_value}`}
                </span>
              </div>

              <div>
                <label className={labelClass}>Usage Type</label>
                <span className={valueClass}>{voucher.usage_type}</span>
              </div>

              <div>
                <label className={labelClass}>Used Count</label>
                <span className={valueClass}>{voucher.used_count || 0}</span>
              </div>

              <div>
                <label className={labelClass}>Max Total Usage</label>
                <span className={valueClass}>{voucher.max_total_usage}</span>
              </div>

              <div>
                <label className={labelClass}>Max Usage Per User</label>
                <span className={valueClass}>{voucher.max_usage_per_user}</span>
              </div>

              <div>
                <label className={labelClass}>Expiry Date</label>
                <span className={valueClass}>
                  {voucher.expiry_date
                    ? new Date(voucher.expiry_date).toLocaleString("en-GB")
                    : "No expiry"}
                </span>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <span className={`${valueClass} text-slate-500 italic`}>
                  {voucher.description || "No description"}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Applies To
              </label>

              <div className="flex flex-wrap gap-2">
                {voucher.applies_to?.temple && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    Temple
                  </span>
                )}
                {voucher.applies_to?.ritual && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    Ritual
                  </span>
                )}
                {voucher.applies_to?.membership && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    Membership
                  </span>
                )}
                {voucher.applies_to?.all_services && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    All Services
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={() => navigate(`/admin/voucher/edit/${id}`)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold"
              >
                Edit
              </button>
              <button
                onClick={() => navigate("/admin/voucher")}
                className="bg-slate-500 hover:bg-slate-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}