import api from "../api/api";

export const voucherService = {
  getAll: async () => {
    const response = await api.get("/admin/vouchers");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/vouchers/${id}`);
    return response.data;
  },

  create: async (formData) => {
    const payload = {
      title: formData.title,
      code: formData.code,
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      applies_to: {
        temple: !!formData.applies_to?.temple,
        ritual: !!formData.applies_to?.ritual,
        membership: !!formData.applies_to?.membership,
        all_services: !!formData.applies_to?.all_services,
      },
      usage_type: formData.usage_type,
      max_total_usage: Number(formData.max_total_usage),
      max_usage_per_user: Number(formData.max_usage_per_user),
      expiry_date: formData.expiry_date || null,
      status: Number(formData.status),
    };

    const response = await api.post("/admin/vouchers/create", payload);
    return response.data;
  },

  update: async (id, formData) => {
    const payload = {
      title: formData.title,
      code: formData.code,
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      applies_to: {
        temple: !!formData.applies_to?.temple,
        ritual: !!formData.applies_to?.ritual,
        membership: !!formData.applies_to?.membership,
        all_services: !!formData.applies_to?.all_services,
      },
      usage_type: formData.usage_type,
      max_total_usage: Number(formData.max_total_usage),
      max_usage_per_user: Number(formData.max_usage_per_user),
      expiry_date: formData.expiry_date || null,
      status: Number(formData.status),
    };

    const response = await api.put(`/admin/vouchers/update/${id}`, payload);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/vouchers/${id}`);
    return response.data;
  },
};