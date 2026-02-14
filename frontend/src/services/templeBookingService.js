import api from "../api/api";

export const templeBookingService = {
  /**
   * Fetches list with pagination and dynamic filters
   * Note: templeId removed as per UI changes
   * @param {Object} params - { page, limit, search, bookingStatus, paymentStatus }
   */
  getAllTempleBookings: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Basic Pagination
      queryParams.append("page", params.page || 1);
      queryParams.append("limit", params.limit || 10);
      
      // Dynamic Filters
      if (params.search) queryParams.append("search", params.search);
      if (params.bookingStatus) queryParams.append("bookingStatus", params.bookingStatus);
      if (params.paymentStatus) queryParams.append("paymentStatus", params.paymentStatus);

      const response = await api.get(`/admin/temple-bookings?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Service Error: getAllTempleBookings", error);
      throw error;
    }
  },

  /**
   * Fetches a single booking by MongoDB ObjectID
   * @param {string} id - The _id of the booking
   */
  getTempleBookingById: async (id) => {
    try {
      const response = await api.get(`/admin/temple-bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Service Error: getTempleBookingById(${id})`, error);
      throw error;
    }
  },

  /**
   * Updates booking status (Pending/Confirmed/Cancelled)
   * Matches Route: router.put("/temple-bookings/status/:id", protectAdmin, updateTempleBookingStatus);
   * @param {string} id - The MongoDB _id
   * @param {number} status - Numeric status (1, 2, or 3)
   */
  updateStatus: async (id, status) => {
    try {
      const response = await api.put(`/admin/temple-bookings/status/${id}`, { 
        booking_status: Number(status) 
      });
      return response.data;
    } catch (error) {
      console.error(`Service Error: updateStatus(${id})`, error);
      throw error;
    }
  }
};