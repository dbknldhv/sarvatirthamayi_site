import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import api from "../../../api/api";
import { toast, Toaster } from "react-hot-toast";
import { RotateCcw, Search as SearchIcon } from "lucide-react";

const cardColors = [
  'bg-[#3b215d]', 'bg-[#eab308]', 'bg-[#db2777]', 
  'bg-[#8b1a8b]', 'bg-[#10b981]', 'bg-[#1e293b]', 
  'bg-[#60a5fa]', 'bg-[#6366f1]', 'bg-[#0891b2]', 
  'bg-[#1e00a3]', 'bg-[#334155]', 'bg-[#86efac]'
];

export default function AssistanceIndex() {
  const navigate = useNavigate(); // Initialize navigation
  const [temples, setTemples] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(true);

  // Function to handle redirection to booking form
  const handleBookingRedirect = (temple) => {
    navigate(`/book-temple/${temple._id}`, { state: { temple } });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statesRes, templesRes] = await Promise.all([
          api.get("/user/states"),
          api.get(selectedState ? `/user/temples?stateName=${encodeURIComponent(selectedState)}` : "/user/temples")
        ]);
        
        if (statesRes.data.success) setStates(statesRes.data.data);
        if (templesRes.data.success) setTemples(templesRes.data.data);
      } catch (err) {
        toast.error("Failed to load sacred gallery");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedState]);

  return (
    <div 
      className="min-h-screen pt-24 px-6 pb-12 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ 
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), url('https://images.unsplash.com/photo-1514222139-b576bb5ce073?q=80&w=2000')` 
      }}
    >
      <Toaster position="top-center" />

      {/* Header & Filter */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="flex justify-end items-center gap-3 mb-6">
          <div className="relative">
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)} 
              className="bg-yellow-50/95 border border-yellow-200 text-[11px] font-bold uppercase rounded-lg px-4 py-2 shadow-sm outline-none appearance-none pr-10 cursor-pointer"
            >
              <option value="">All States</option>
              {states.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-yellow-600">
               <SearchIcon size={14} />
            </div>
          </div>
          {selectedState && (
            <button onClick={() => setSelectedState("")} className="p-2 bg-white/80 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50">
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-serif text-[#4a3427] mb-2">Temple Assistance</h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-24 bg-[#4a3427]/20"></div>
            <span className="text-2xl text-[#4a3427]/40">❧ ♡ ☙</span>
            <div className="h-[1px] w-24 bg-[#4a3427]/20"></div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-[#4a3427] font-bold tracking-widest">
            SYNCHRONIZING SACRED DATA...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-14">
            {temples.map((temple, index) => (
              <div 
                key={temple._id} 
                className="group flex flex-col items-center cursor-pointer"
                onClick={() => handleBookingRedirect(temple)} // Trigger redirect on click
              >
                {/* Image Card with Colored Overlay */}
                <div className="w-full aspect-[16/10] rounded-2xl shadow-2xl relative overflow-hidden transform transition-all duration-500 group-hover:scale-[1.05] group-hover:-translate-y-2 border-4 border-white/30">
                  
                  {/* Temple Image from API */}
                  <img 
                    src={temple.image || 'https://images.unsplash.com/photo-1600665182256-4273832be556?q=80&w=800'} 
                    alt={temple.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Color Overlay */}
                  <div className={`absolute inset-0 ${cardColors[index % cardColors.length]} opacity-85 mix-blend-multiply group-hover:opacity-75 transition-opacity`}></div>
                  
                  {/* Code Text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-black tracking-[0.2em] text-white drop-shadow-2xl">
                      {temple.code || temple.name.substring(0, 5).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Name Tag */}
                <p className="mt-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-700 bg-white/70 backdrop-blur px-5 py-2 rounded-full shadow-md border border-white/50">
                  {temple.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}