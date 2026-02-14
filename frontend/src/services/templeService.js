import api from "../api/api";

// Replace this with your actual backend domain (e.g., https://api.yourdomain.com)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Helper to format image URLs
 * If the path starts with 'http', it's already a full URL.
 * Otherwise, it prepends the BASE_URL.
 */
const formatImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Ensure there is a slash between BASE_URL and path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
};

export const templeService = {
  // 1. Get all temples (Admin List)
  // templeService.js
getTemples: async (params) => {
  try {
    const response = await api.get("/admin/temples", { params });
    const data = response.data.temples || response.data || [];
    
    return Array.isArray(data) 
      ? data.map(temple => ({ 
          ...temple, 
          image: formatImageUrl(temple.image),
          // Ensure location strings are pre-formatted for the UI
          location_string: temple.city_id?.name 
            ? `${temple.city_id.name}, ${temple.state_id?.name || ''}` 
            : "Location not set"
        }))
      : data;
  } catch (error) {
    console.error("Error in getTemples service:", error);
    throw error;
  }
},

  // 2. Get single temple details by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/admin/temples/${id}`);
      const temple = response.data.temple || response.data;
      
      // Format the image URL for the view profile
      if (temple && temple.image) {
        temple.image = formatImageUrl(temple.image);
      }
      return temple;
    } catch (error) {
      console.error("Error in getById service:", error);
      throw error;
    }
  },

  // 3. Create new temple
  createTemple: async (formData) => {
    try {
      const response = await api.post("/admin/temples/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Error in createTemple service:", error);
      throw error;
    }
  },

  // 4. Update existing temple
  updateTemple: async (id, formData) => {
    try {
      const response = await api.put(`/admin/temples/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Error in updateTemple service:", error);
      throw error;
    }
  },

  // ... (Rest of your service methods: delete, getCountries, etc. remain the same)
  deleteTemple: async (id) => {
    try {
      const response = await api.delete(`/admin/temples/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting temple:", error);
      throw error;
    }
  },

  getCountries: async () => {
    try {
      const response = await api.get("/admin/countries");
      return response.data.countries || response.data || [];
    } catch (error) {
      console.error("Error fetching countries:", error);
      return [];
    }
  },

  getStates: async () => {
    try {
      const response = await api.get("/admin/states");
      return response.data.states || response.data || [];
    } catch (error) {
      console.error("Error fetching states:", error);
      return [];
    }
  },

  getCities: async (stateId) => {
    try {
      // 1. Try Query Params (Most common for filters)
      // This results in: /admin/cities?state_id=64f...
      const response = await api.get("/admin/cities", {
        params: { state_id: stateId } 
      });

      // 2. ALTERNATE: If your backend uses URL params like /admin/cities/64f...
      // UNCOMMENT the line below and COMMENT the one above if the first fails:
      // const response = await api.get(`/admin/cities/${stateId}`);

      console.log("Cities API Response:", response.data); // Debug log
      return response.data.cities || response.data || [];
    } catch (error) {
      console.error("Error fetching cities:", error);
      return [];
    }
  },
};