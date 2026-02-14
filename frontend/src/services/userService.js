// src/services/userService.js
import api from "../api/api"; 

export const userService = {
  getUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  // Updated to handle FormData for Image Uploads
  createUser: async (data) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
      
    const response = await api.post("/admin/users/create", data, config);
    return response.data;
  },

  // Updated to handle FormData for Image Uploads
  updateUser: async (id, data) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};

    const response = await api.put(`/admin/users/update/${id}`, data, config);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  }
};