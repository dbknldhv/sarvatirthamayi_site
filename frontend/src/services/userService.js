import api from "../api/api"; 

export const userService = {
  getUsers: async () => {
    const timestamp = new Date().getTime();
    const response = await api.get(`/admin/users?_t=${timestamp}`);
    return response.data?.users || response.data?.data || [];
  },

  getUserById: async (id) => {
    const timestamp = new Date().getTime();
    const response = await api.get(`/admin/users/${id}?_t=${timestamp}`);
    return response.data?.user || response.data?.data || null;
  },

  createUser: async (data) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await api.post("/admin/users/create", data, config);
    return response.data;
  },

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