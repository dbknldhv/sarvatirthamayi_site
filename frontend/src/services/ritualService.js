import api from "../api/api";

export const ritualService = {
  /**
   * Fetch all rituals from the database.
   * Used for the main listing table/cards.
   */
  getAllRituals: async () => {
    try {
      const response = await api.get("/admin/rituals");
      return response.data.data || [];
    } catch (error) {
      console.error("Fetch rituals failed:", error);
      return [];
    }
  },

  getRitualById: async (id) => {
    // Check if ID exists before calling to prevent /undefined/ error
    if (!id) throw new Error("Ritual ID is required");
    const response = await api.get(`/admin/rituals/${id}`);
    return response.data.data;
  },

  /**
   * Fetch all temples for the "Select Temple" dropdown.
   * Matches templeController (getAdminTempleList) which returns the 'temples' key.
   */
  getTemples: async () => {
    try {
      const response = await api.get("/admin/temples");
      // Safety check: Looking for 'temples' key specifically from your templeController
      return response.data.temples || response.data.data || [];
    } catch (error) {
      console.error("Temple fetch failed:", error);
      return [];
    }
  },

  /**
   * Fetch ritual types from the ritual_types collection.
   * Matches ritualController (getRitualTypes) which returns the 'data' key.
   */
  getRitualTypes: async () => {
    try {
      const response = await api.get("/admin/ritual-types");
      return response.data.data || [];
    } catch (error) {
      console.error("Ritual Type fetch failed:", error);
      return [];
    }
  },

  /**
   * Create a new ritual.
   * Mandatory: Use FormData to handle the binary image file.
   */
  createRitual: async (formData) => {
    const response = await api.post('/admin/rituals', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update an existing ritual.
   * Handles text updates and optional new image uploads.
   */
  updateRitual: async (id, formData) => {
    const response = await api.put(`/admin/rituals/update/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete a ritual from the database.
   */
  deleteRitual: async (id) => {
    const response = await api.delete(`/admin/rituals/${id}`);
    return response.data;
  },

  /**
   * Client-side filtering logic for the Search bar and Status dropdown.
   */
  filterRituals: (rituals, searchTerm, statusFilter) => {
    if (!Array.isArray(rituals)) return [];
    
    return rituals.filter((item) => {
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.temple_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = 
        statusFilter === "all" || 
        String(item.status) === statusFilter;
        
      return matchesSearch && matchesStatus;
    });
  },
};