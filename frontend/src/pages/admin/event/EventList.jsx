import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaPlus, FaEye, FaEdit, FaTrash, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); 

  useEffect(() => {
    fetchEvents();
  }, [currentPage]); // Automatically re-fetches when page changes

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/events?page=${currentPage}&limit=${limit}`);
      setEvents(res.data.events);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* ... (Search bar and Table headers remain the same) ... */}

      {/* Dynamic Pagination Section */}
      <div className="px-6 py-5 bg-white border-t border-gray-100 flex justify-center items-center">
        <div className="flex gap-1">
          {/* Previous Page */}
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50 disabled:opacity-30"
          >
            <FaChevronLeft className="text-[10px]"/>
          </button>

          {/* Dynamic Page Numbers */}
          {[...Array(totalPages)].map((_, index) => {
            const pageNum = index + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 flex items-center justify-center border rounded text-xs font-bold transition-all ${
                  currentPage === pageNum 
                    ? 'bg-[#6366f1] text-white shadow-md border-[#6366f1]' 
                    : 'text-gray-500 hover:bg-gray-100 border-gray-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Page */}
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50 disabled:opacity-30"
          >
            <FaChevronRight className="text-[10px]"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventList;