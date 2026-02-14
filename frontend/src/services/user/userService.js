// src/services/user/userService.js
import api from "../../api/api"; 

export const userService = {
  // ==========================================
  // --- 👤 USER / CUSTOMER ACTIONS ---
  // (Prefixed with /user in userRoutes.js)
  // ==========================================

  getRituals: async () => {
    const response = await api.get("/user/rituals");
    return response.data; 
  },

  getPublicTemples: async () => {
    const response = await api.get("/user/temples");
    return response.data;
  },

  getStates: async () => {
    const response = await api.get("/user/states");
    return response.data;
  },

  getMembershipPlans: async () => {
    const response = await api.get("/user/membership-plans");
    return response.data;
  },

  purchaseMembership: async (data) => {
    const response = await api.post("/user/purchase-membership", data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },

  updateProfile: async (formData) => {
    // Uses multipart/form-data for profileImage and bannerImage
    const response = await api.put("/user/update-profile", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  bookRitual: async (bookingData) => {
    const response = await api.post("/user/book-ritual", bookingData);
    return response.data;
  },

  // ==========================================
  // --- 🛠️ ADMIN USER MANAGEMENT ---
  // (Prefixed with /admin in adminRoutes.js)
  // ==========================================

  getUsers: async () => {
    /**
     * Hits: GET /api/admin/users
     * Controller: controllers/userController.js -> getAllUsers
     */
    const response = await api.get("/admin/users");
    return response.data; 
  },

  getUserById: async (id) => {
    /**
     * Hits: GET /api/admin/users/:id
     * Controller: controllers/userController.js -> getUserById
     */
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUserAdmin: async (id, userData) => {
    /**
     * Hits: PUT /api/admin/users/update/:id
     * Used by Admin to update any user's details
     */
    const response = await api.put(`/admin/users/update/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    /**
     * Hits: DELETE /api/admin/users/:id
     * Controller: controllers/userController.js -> deleteUser
     */
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  }
};