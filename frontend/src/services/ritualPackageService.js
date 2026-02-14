import api from "../api/api";

// Target endpoint for the ritualpackages collection
const RITUAL_PACKAGE_BASE = "/admin/ritual-packages";

export const ritualPackageService = {
  /**
   * Fetches packages with pagination, search, and status filters.
   * Matches the URL-driven state in RitualPackages.jsx.
   */
  getAll: async (search = "", status = "", page = 1, limit = 10) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters if they exist
      if (search) params.append("search", search);
      
      // Explicitly check for empty string to allow '0' (Inactive) status
      if (status !== "" && status !== null) params.append("status", status);
      
      // Add pagination parameters
      params.append("page", page);
      params.append("limit", limit);

      const response = await api.get(`${RITUAL_PACKAGE_BASE}?${params.toString()}`);
      
      // The backend returns { success: true, data: [...], total: X }
      const packages = response.data.data || [];
      
      return {
        success: true,
        data: packages,
        // Ensure we return the total count for the pagination sliding logic
        total: response.data.total || response.data.count || packages.length
      };
    } catch (error) {
      console.error("Fetch Error:", error.response?.data || error.message);
      return { 
        success: false, 
        data: [], 
        total: 0, 
        message: error.response?.data?.message || "Server Error" 
      };
    }
  },

  /**
   * Fetch a single package for View or Edit redirection
   */
  getById: async (id) => {
    try {
      const response = await api.get(`${RITUAL_PACKAGE_BASE}/${id}`);
      return response.data; 
    } catch (error) {
      console.error(`Error fetching package ${id}:`, error.message);
      throw error;
    }
  },

  /**
   * Create new package
   */
  create: async (payload) => {
    const response = await api.post(RITUAL_PACKAGE_BASE, payload);
    return response.data;
  },

  /**
   * Update existing package
   */
  update: async (id, payload) => {
    const response = await api.put(`${RITUAL_PACKAGE_BASE}/${id}`, payload);
    return response.data;
  },

  /**
   * Delete package with Toast notification support
   */
  delete: async (id) => {
    const response = await api.delete(`${RITUAL_PACKAGE_BASE}/${id}`);
    return response.data;
  }
};

export default ritualPackageService;