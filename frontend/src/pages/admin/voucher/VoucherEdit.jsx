import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaChevronRight, FaSpinner } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import { voucherService } from "../../../services/voucherService";

export default function VoucherEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    applies_to: {
      temple: false,
      ritual: false,
      membership: false,
      all_services: false,
    },
    usage_type: "single",
    max_total_usage: 1,
    max_usage_per_user: 1,
    expiry_date: "",
    status: 1,
  });

  useEffect(() => {
    const loadVoucher = async () => {
      try {
        const res = await voucherService.getById(id);
        const v = res.data;

        setFormData({
          title: v.title || "",
          code: v.code || "",
          description: v.description || "",
          discount_type: v.discount_type || "percentage",
          discount_value: v.discount_value || "",
          applies_to: {
            temple: !!v.applies_to?.temple,
            ritual: !!v.applies_to?.ritual,
            membership: !!v.applies_to?.membership,
            all_services: !!v.applies_to?.all_services,
          },
          usage_type: v.usage_type || "single",
          max_total_usage: v.max_total_usage || 1,
          max_usage_per_user: v.max_usage_per_user || 1,
          expiry_date: v.expiry_date
            ? new Date(v.expiry_date).toISOString().slice(0, 16)
            : "",
          status: v.status ?? 1,
        });
      } catch (error) {
        toast.error("Failed to load voucher");
      } finally {
        setLoading(false);
      }
    };

    loadVoucher();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await voucherService.update(id, formData);
      toast.success("Voucher updated successfully");
      setTimeout(() => navigate("/admin/voucher"), 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update voucher");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full border border-slate-200 px-4 py-3 rounded-xl outline-none text-slate-900 placeholder:text-slate-300 bg-white focus:border-indigo-500 transition-colors";
  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block ml-1";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <FaSpinner className="animate-spin text-3xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
          <Link to="/admin/voucher" className="hover:text-indigo-600">Vouchers</Link>
          <FaChevronRight size={8} />
          <span className="text-slate-600">Edit Voucher</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">Edit Voucher</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Voucher Code</label>
                <input
                  className={inputClass}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className={labelClass}>Discount Type</label>
                <select
                  className={inputClass}
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Discount Value</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Usage Type</label>
                <select
                  className={inputClass}
                  value={formData.usage_type}
                  onChange={(e) => setFormData({ ...formData, usage_type: e.target.value })}
                >
                  <option value="single">Single</option>
                  <option value="multiple">Multiple</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Max Total Usage</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.max_total_usage}
                  onChange={(e) => setFormData({ ...formData, max_total_usage: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Max Usage Per User</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.max_usage_per_user}
                  onChange={(e) => setFormData({ ...formData, max_usage_per_user: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Expiry Date</label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  rows="3"
                  className={`${inputClass} resize-none`}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Applies To</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {["temple", "ritual", "membership", "all_services"].map((item) => (
                    <label key={item} className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.applies_to[item]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            applies_to: {
                              ...formData.applies_to,
                              [item]: e.target.checked,
                            },
                          })
                        }
                      />
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {item.replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate("/admin/voucher")}
                className="px-6 py-3 font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                {submitting ? <FaSpinner className="animate-spin" /> : "Update Voucher"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}