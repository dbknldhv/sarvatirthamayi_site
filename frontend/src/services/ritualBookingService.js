import api from "../api/api"; // Ensure this points to your axios instance

export const ritualBookingService = {
  // Fetch all bookings from /api/admin/ritual-bookings
  getAllRitualBookings: async () => {
    try {
      const response = await api.get("/admin/ritual-bookings");
      // The response is expected as an array from the backend controller
      return { data: response.data }; 
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return { data: [] };
    }
  },

  // Fetch a single booking for the View page
  getById: async (id) => {
    try {
      const response = await api.get(`/admin/ritual-bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching booking details:", error);
      return null;
    }
  },

  // Logic to handle filtering in the UI
  filterBookings: (bookings, searchTerm, bStatus, pStatus) => {
    return bookings.filter((item) => {
      // Matches devotee name or the unique Booking ID
      const matchesSearch = 
        item.devotees_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.booking_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by Booking Status (1: Pending, 2: Confirmed)
      const matchesBStatus = bStatus === "all" || item.booking_status.toString() === bStatus;
      
      // Filter by Payment Status (1: Pending, 2: Paid)
      const matchesPStatus = pStatus === "all" || item.payment_status.toString() === pStatus;
      
      return matchesSearch && matchesBStatus && matchesPStatus;
    });
  }
};

export const ritualService = {
  getRituals: async () => {
    try {
      const response = await api.get("/admin/rituals");
      return response.data.rituals || response.data || [];
    } catch (error) {
      return [];
    }
  }
};