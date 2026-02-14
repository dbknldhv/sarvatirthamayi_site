// src/services/ritualTypesService.js
import api from "../api/api"; // Using your existing Axios instance

export const ritualTypesService = {
  // Get All Ritual Types
  getAllRitualTypes: async () => {
    const response = await api.get("/admin/ritual-types");
    return response.data;
  },

  // Get Single Ritual Type
  getRitualTypeById: async (id) => {
    const response = await api.get(`/admin/ritual-types/${id}`);
    return response.data;
  },

  // Create New Ritual Type
  createRitualType: async (data) => {
    const response = await api.post("/admin/ritual-types", data);
    return response.data;
  },

  // Update Ritual Type
  updateRitualType: async (id, data) => {
    const response = await api.put(`/admin/ritual-types/${id}`, data);
    return response.data;
  },

  // Delete Ritual Type
  deleteRitualType: async (id) => {
    const response = await api.delete(`/admin/ritual-types/${id}`);
    return response.data;
  }
};