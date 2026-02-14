import api from "../api/api";

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
      temples: Array.isArray(tempRes.data) ? tempRes.data : tempRes.data.temples || [],
      memberships: Array.isArray(membRes.data) ? membRes.data : membRes.data.memberships || []
    };
  },

  /**
   * Creates a new membership card
   * Ensures data types match the Mongoose Schema (Numbers for status/duration)
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
      // Map the selected temples array or a single temple_id to the schema structure
      temples: formData.selectedTemples 
        ? formData.selectedTemples.map(t => ({
            templeId: t.templeId,
            name: t.name,
            maxVisits: Number(t.maxVisits)
          }))
        : formData.temple_id ? [{
            templeId: formData.temple_id,
            maxVisits: Number(formData.visits)
          }] : []
    };

    return await api.post("/admin/memberships/create", payload);
  },

  /**
   * Updates an existing membership card
   * Converts UI strings (Active/Months) to Schema-valid Numbers (1/2)
   */
  update: async (id, formData) => {
    const payload = {
      name: formData.name,
      // Logic to handle both string labels from UI and raw numbers
      status: formData.status === "Active" ? 1 : (formData.status === "Inactive" ? 0 : Number(formData.status)),
      duration_type: formData.duration_type === "Months" ? 1 : (formData.duration_type === "Years" ? 2 : Number(formData.duration_type)),
      duration: Number(formData.duration),
      price: Number(formData.price),
      visits: Number(formData.visits),
      description: formData.description,
      // Ensure the array of objects matches the Mongoose Schema exactly
      temples: (formData.selectedTemples || []).map(t => ({
        templeId: t.templeId || t._id,
        name: t.name,
        maxVisits: Number(t.maxVisits)
      }))
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