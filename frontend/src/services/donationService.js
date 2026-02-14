import api from "../api/api";

export const DonationService = {
  // 1. Get all donations (supports pagination/search params)
  getDonations: async (params) => {
    try {
      const response = await api.get('/admin/donations', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 2. Get single donation details by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/admin/donations/${id}`);
      // Safely returns the donation object regardless of wrapper
      return response.data.donation || response.data;
    } catch (error) {
      throw error;
    }
  },

  // 3. Create new donation record (supports File/Image upload)
  create: async (formData) => {
    try {
      const response = await api.post('/admin/donations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 4. Update donation record (supports File/Image upload)
  update: async (id, formData) => {
    try {
      const response = await api.put(`/admin/donations/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 5. Delete a donation
  deleteDonation: async (id) => {
    try {
      const response = await api.delete(`/admin/donations/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};