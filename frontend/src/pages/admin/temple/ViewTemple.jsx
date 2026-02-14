import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { templeService } from "../../../services/templeService";
import { 
  ArrowLeft, MapPin, Phone, Mail, Clock, 
  ShieldCheck, Info, Globe, 
  Map as MapIcon, Edit3, Loader2, ExternalLink, Copy, Check
} from "lucide-react";

export default function ViewTemple() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [temple, setTemple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const fetchTemple = async () => {
      try {
        const data = await templeService.getById(id);
        // Handle potential nested data structure from API
        setTemple(data?.temple || data);
      } catch (err) {
        console.error("Error fetching temple:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemple();
  }, [id]);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="relative">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
            <div className="absolute inset-0 blur-xl bg-indigo-400/20 animate-pulse"></div>
        </div>
        <p className="text-slate-500 font-medium tracking-tight">Loading temple profile...</p>
      </div>
    );
  }

  if (!temple) {
    return (
      <div className="p-20 text-center bg-[#F8FAFC] min-h-screen">
        <h2 className="text-2xl font-bold text-slate-800">Temple Not Found</h2>
        <button onClick={() => navigate("/admin/temple")} className="mt-4 text-indigo-600 font-bold hover:underline">
          Return to List
        </button>
      </div>
    );
  }

  // Helper to safely get City/State names from either Objects or Flat Keys
  const getLocationName = (idField, nameField, fallbackField) => {
    if (typeof idField === 'object' && idField?.name) return idField.name;
    return nameField || fallbackField || "";
  };

  const SectionHeader = ({ title, icon: Icon }) => (
    <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.15em] mb-4 flex items-center gap-2 border-b border-indigo-50 pb-2">
      {Icon && <Icon size={14} />} {title}
    </h3>
  );

  const InfoRow = ({ label, value, isFullWidth = false, canCopy = false, isLink = false, linkType = "" }) => (
    <div className={`py-3 group ${isFullWidth ? 'col-span-full' : ''}`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 italic">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {isLink && value ? (
            <a 
                href={linkType === 'tel' ? `tel:${value}` : `mailto:${value}`}
                className="text-sm text-indigo-600 font-bold hover:underline break-words"
            >
                {value}
            </a>
        ) : (
            <span className="text-sm text-slate-700 font-bold break-words">
                {value || <span className="text-slate-300 italic font-normal">Not Provided</span>}
            </span>
        )}
        
        {canCopy && value && (
          <button 
            onClick={() => handleCopy(value, label)}
            className="p-1 hover:bg-slate-100 rounded transition-all md:opacity-0 md:group-hover:opacity-100"
          >
            {copiedField === label ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Actions Bar */}
        <div className="sticky top-4 z-20 flex justify-between items-center bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <button 
            onClick={() => navigate("/admin/temple")} 
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Directory</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
               <span className="text-[9px] font-black text-slate-300 uppercase">Internal ID</span>
               <span className="text-xs font-mono font-bold text-slate-500">#{temple.sql_id || temple._id?.slice(-5) || "NEW"}</span>
            </div>
            
            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                temple.status === 1 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-400 text-white'
            }`}>
              {temple.status === 1 && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              )}
              {temple.status === 1 ? 'Active' : 'Inactive'}
            </span>

            <button 
              onClick={() => navigate(`/admin/temple/edit/${id}`)}
              className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Edit3 size={14} /> <span className="hidden sm:inline">Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-64 md:h-96 bg-slate-100 relative">
                {temple.image ? (
                  <img src={temple.image} alt={temple.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 flex-col gap-2">
                    <Info size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Image Available</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent flex flex-col justify-end p-6 md:p-10">
                  <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">{temple.name}</h1>
                  <p className="text-white/80 text-sm mt-3 flex items-center gap-2 font-medium">
                    <MapPin size={18} className="text-indigo-400" /> 
                    {/* SAFE LOCATION ACCESS */}
                    {getLocationName(temple.city_id, temple.city_name, temple.city) || "City N/A"}, {getLocationName(temple.state_id, temple.state_name, temple.state) || "State N/A"}
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-10 space-y-10">
                <section>
                  <SectionHeader title="Institutional Profile" icon={Info} />
                  <div className="grid grid-cols-1 gap-4">
                    <InfoRow label="One Line Summary" value={temple.short_description} isFullWidth canCopy />
                    <div className="py-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 italic">Detailed History/Description</span>
                      <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium whitespace-pre-line">
                        {temple.long_description || "No detailed description available."}
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionHeader title="Geospatial Details" icon={Globe} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                    <InfoRow label="Address" value={temple.address_line1} canCopy />
                    <InfoRow label="Landmark" value={temple.landmark} />
                    <InfoRow label="Pincode" value={temple.pincode} canCopy />
                    
                    {/* UPDATED STATE & CITY ROWS */}
                    <InfoRow 
                      label="State" 
                      value={getLocationName(temple.state_id, temple.state_name, temple.state)} 
                    />
                    <InfoRow 
                      label="City" 
                      value={getLocationName(temple.city_id, temple.city_name, temple.city)} 
                    />
                    
                    <InfoRow label="Coordinates" value={temple.latitude ? `${temple.latitude}, ${temple.longitude}` : "N/A"} canCopy />
                    
                    <div className="col-span-full mt-4 p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 hover:border-indigo-300 transition-all cursor-pointer group"
                         onClick={() => temple.address_url && window.open(temple.address_url, '_blank')}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1 mr-4">
                          <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Google Maps Integration</span>
                          <p className="text-indigo-600 text-xs font-bold truncate max-w-xs md:max-w-md">
                            {temple.address_url || "Map link not provided"}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ExternalLink size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Operational Card */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <SectionHeader title="Operations" icon={Clock} />
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Darshan Hours</span>
                  <span className="text-xs font-black text-slate-800">{temple.open_time || '--:--'} — {temple.close_time || '--:--'}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Visit Price</span>
                  <span className="text-sm font-black text-emerald-700">₹{temple.visit_price || 0}</span>
                </div>
                <div className="pt-4 border-t border-slate-50 space-y-1">
                  <InfoRow label="Contact Mobile" value={temple.mobile_number} canCopy isLink linkType="tel" />
                  <InfoRow label="Official Email" value={temple.email} canCopy isLink linkType="mailto" />
                </div>
              </div>
            </div>

            {/* Admin Management Card */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <SectionHeader title="Assigned Admin" icon={ShieldCheck} />
              <div className="flex items-center gap-4 mb-6 p-2">
                <div className="h-14 w-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-100 flex items-center justify-center text-white text-lg font-black uppercase">
                  {temple.admin_first_name?.charAt(0)}{temple.admin_last_name?.charAt(0) || temple.admin_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {temple.admin_name || `${temple.admin_first_name || ''} ${temple.admin_last_name || ''}`}
                  </p>
                  <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">Authorized Manager</p>
                </div>
              </div>
              <div className="space-y-1">
                <InfoRow label="Admin Phone" value={temple.admin_mobile} canCopy isLink linkType="tel" />
                <InfoRow label="Admin Email" value={temple.admin_email} canCopy isLink linkType="mailto" />
              </div>
            </div>

            {/* System Metrics Card */}
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
              <SectionHeader title="System Metrics" icon={MapIcon} />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <span className="text-[9px] font-black text-white/40 uppercase block mb-1">Global Rank</span>
                  <span className="text-2xl font-black text-indigo-400">{temple.sequence || 0}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <span className="text-[9px] font-black text-white/40 uppercase block mb-1">Training ID</span>
                  <span className="text-2xl font-black text-emerald-400">{temple.training_sequence || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}