import api from "../api/api";

/**
 * Helper to normalize temple structure for backend
 */
const mapTemple = (t) => ({
  temple_id: t.temple_id || t.templeId || t._id,
  temple_name: t.temple_name || t.name || "",
  max_visits: Number(t.max_visits || t.maxVisits || 1),
});

export const membershipService = {
  /**
   * Fetches temples and memberships simultaneously for initialization
   */
  getInitialData: async () => {
    const [tempRes, membRes] = await Promise.all([
      api.get("/admin/temples"),
      api.get("/admin/memberships")
    ]);

    return {
      temples: Array.isArray(tempRes.data)
        ? tempRes.data
        : tempRes.data.temples || tempRes.data.data || [],

      memberships: Array.isArray(membRes.data)
        ? membRes.data
        : membRes.data.memberships || membRes.data.data || []
    };
  },

  /**
   * Creates a new membership card
   */
  create: async (formData) => {
    const payload = {
      name: formData.name,
      status: Number(formData.status),
      duration_type: Number(formData.duration_type),
      duration: Number(formData.duration),
      price: Number(formData.price),
      visits: Number(formData.visits),
      description: formData.description,

      // ✅ FIXED mapping (supports both formats)
      temples: formData.selectedTemples
        ? formData.selectedTemples.map(mapTemple)
        : formData.temple_id
        ? [
            {
              temple_id: formData.temple_id,
              temple_name: formData.temple_name || "",
              max_visits: Number(formData.visits || 1),
            },
          ]
        : [],
    };

    return await api.post("/admin/memberships/create", payload);
  },

  /**
   * Updates an existing membership card
   */
  update: async (id, formData) => {
    const payload = {
      name: formData.name,

      status:
        formData.status === "Active"
          ? 1
          : formData.status === "Inactive"
          ? 0
          : Number(formData.status),

      duration_type:
        formData.duration_type === "Months"
          ? 1
          : formData.duration_type === "Years"
          ? 2
          : Number(formData.duration_type),

      duration: Number(formData.duration),
      price: Number(formData.price),
      visits: Number(formData.visits),
      description: formData.description,

      // ✅ FIXED mapping
      temples: (formData.selectedTemples || formData.temples || []).map(mapTemple),
    };

    return await api.put(`/admin/memberships/update/${id}`, payload);
  },

  /**
   * Deletes a membership card by ID
   */
  delete: async (id) => {
    return await api.delete(`/admin/memberships/${id}`);
  }
};