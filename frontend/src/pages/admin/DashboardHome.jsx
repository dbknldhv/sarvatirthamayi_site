import React, { useState, useEffect } from "react";
import { 
  Users, Crown, MapPin, ScrollText, 
  Clock, CheckCircle, AlertCircle, Settings2, ArrowUpRight, Ticket
} from "lucide-react";
import api from "../../api/api";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ritualRate, setRitualRate] = useState(25);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get("/admin/dashboard-stats");
        setStats(res.data.data);
      } catch (err) {
        toast.error("Spiritual metrics synchronization failed.");
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const handleUpdateRate = async () => {
    try {
      await api.put("/admin/settings/global-discount", { ritualDiscountRate: ritualRate });
      toast.success(`Ritual Discount set to ${ritualRate}%`);
    } catch (err) {
      toast.error("Failed to update rates.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Synchronizing System Metrics...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter italic">Spiritual Oversight</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time pulse of the Sarvatirthamayi ecosystem.</p>
        </div>
        <div className="bg-white px-6 py-2 rounded-full border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
          Live Status • {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* PRIMARY STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Devotees" value={stats.totalUsers} icon={<Users />} color="bg-blue-600" />
        <StatCard title="Sovereign Members" value={stats.sovereignMembers} icon={<Crown />} color="bg-amber-500" />
        <StatCard title="Sacred Visits" value={stats.templeBookings} icon={<MapPin />} color="bg-emerald-600" />
        <StatCard title="Ritual Bookings" value={stats.ritualBookings} icon={<ScrollText />} color="bg-purple-600" />
      </div>

      {/* SECONDARY CONTROLS & MONITORING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* GLOBAL DISCOUNT BOX */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <Settings2 size={20} strokeWidth={3}/>
            <h3 className="font-black text-xs uppercase tracking-widest">Global Controls</h3>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1">Ritual Member Rate (%)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={ritualRate} 
                onChange={(e) => setRitualRate(e.target.value)}
                className="flex-1 h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-xl"
              />
              <button onClick={handleUpdateRate} className="px-6 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">
                <ArrowUpRight size={20}/>
              </button>
            </div>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl">
            <p className="text-[10px] text-indigo-600 font-bold leading-relaxed uppercase italic">
              Changes apply instantly to all active authorized member ritual packages.
            </p>
          </div>
        </div>

        {/* FULFILLMENT TRACKER */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <h3 className="font-black text-xs uppercase tracking-widest mb-8 text-slate-400">Fulfillment & Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusBox label="Pending Sankalpa" value={stats.pendingRituals} icon={<Clock />} color="text-amber-500" bg="bg-amber-50" />
            <StatusBox label="Completed Poojas" value={stats.ritualBookings - stats.pendingRituals} icon={<CheckCircle />} color="text-emerald-500" bg="bg-emerald-50" />
            <StatusBox label="Active Vouchers" value={stats.activeVouchers} icon={<Ticket />} color="text-indigo-500" bg="bg-indigo-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center gap-6">
      <div className={`p-5 ${color} text-white rounded-[1.5rem] shadow-lg shadow-current/20`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{value.toLocaleString()}</h2>
      </div>
    </motion.div>
  );
}

function StatusBox({ label, value, icon, color, bg }) {
  return (
    <div className={`p-6 ${bg} rounded-[2rem] border border-white/50`}>
      <div className={`flex items-center gap-2 ${color} mb-3`}>
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  );
}