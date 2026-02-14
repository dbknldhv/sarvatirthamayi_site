import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { templeService } from "../../../services/templeService";
import { 
  Save, Loader2, ArrowLeft, Camera, Globe, 
  MapPin, Clock, ShieldCheck, Tag, Info, X, AlertCircle
} from "lucide-react";

const Label = ({ children }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block italic">
    {children}
  </label>
);

const Input = (props) => (
  <input 
    {...props} 
    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all" 
  />
);

const Select = (props) => (
  <select 
    {...props} 
    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none" 
  />
);

export default function EditTemple() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [metadata, setMetadata] = useState({ 
    countries: [{_id: "696c6d7e5061dc0ec0cc7627", name: "India"}], 
    states: [], 
    cities: [] 
  });

  const [formData, setFormData] = useState({
    name: "", status: 1, short_description: "", long_description: "",
    mobile_number: "", email: "", open_time: "", close_time: "", visit_price: "",
    address_line1: "", address_line2: "", landmark: "",
    country_id: "696c6d7e5061dc0ec0cc7627", 
    state_id: "", city_id: "", pincode: "",
    latitude: "", longitude: "", address_url: "",
    sequence: "", training_sequence: "",
    admin_first_name: "", admin_last_name: "", admin_email: "", admin_mobile: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statesData, citiesData, templeResponse] = await Promise.all([
          templeService.getStates(),
          templeService.getCities(),
          templeService.getById(id)
        ]);

        setMetadata(prev => ({ 
          ...prev,
          states: statesData || [], 
          cities: citiesData || [] 
        }));
        
        const t = templeResponse?.temple || templeResponse;
        if (t) {
          setFormData({
            ...t,
            country_id: t.country_id?._id || t.country_id || "696c6d7e5061dc0ec0cc7627",
            state_id: t.state_id?._id || t.state_id || "",
            city_id: t.city_id?._id || t.city_id || "",
          });
          if (t.image) setPreview(t.image);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setFetching(false);
      }
    };
    loadData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      const payload = {
        ...formData,
        status: Number(formData.status),
        visit_price: Number(formData.visit_price),
        sequence: Number(formData.sequence),
        training_sequence: Number(formData.training_sequence)
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
          data.append(key, payload[key]);
        }
      });

      if (image) data.append("image", image);

      await templeService.updateTemple(id, data);
      navigate(`/admin/temple/view/${id}`);
    } catch (err) {
      alert("Update failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Form Fields...</span>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen pb-32 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="group flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-all"
          >
            <div className="p-2 bg-white rounded-xl border border-slate-200 group-hover:border-rose-100 group-hover:bg-rose-50 transition-all">
                <X size={16} />
            </div>
            Discard Changes
          </button>
          <div className="text-right hidden sm:block">
             <span className="text-[9px] font-black text-indigo-400 uppercase block tracking-widest mb-1">Database Management</span>
             <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
               ID: {id.slice(-8)}
             </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Main Visuals & Geography */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="relative h-64 bg-slate-100 group">
                    {preview ? (
                        <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <Camera size={48} strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-widest mt-2">No Header Image</p>
                        </div>
                    )}
                    <label className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl cursor-pointer hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-3 border border-white/20">
                        <Camera size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Update Photo</span>
                        <input type="file" className="hidden" onChange={handleImage} accept="image/*" />
                    </label>
                </div>

                <div className="p-8 md:p-12">
                  <Label>Temple Identity</Label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full bg-transparent text-3xl md:text-5xl font-black text-slate-800 outline-none border-b-4 border-slate-50 focus:border-indigo-500 uppercase tracking-tight transition-all pb-4 mb-10"
                    placeholder="ENTER TEMPLE NAME"
                  />

                  <div className="space-y-10">
                    <section className="space-y-6">
                       <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                        <MapPin size={14}/> Geography & Country
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2"><Label>Street Address</Label><Input name="address_line1" value={formData.address_line1} onChange={handleChange} /></div>
                          
                          {/* Country, State, City Responsive Grid */}
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Country</Label>
                                <Select name="country_id" value={formData.country_id} onChange={handleChange}>
                                    {metadata.countries.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </Select>
                            </div>
                            <div>
                                <Label>State</Label>
                                <Select name="state_id" value={formData.state_id} onChange={handleChange}>
                                    <option value="">Select State</option>
                                    {metadata.states.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </Select>
                            </div>
                            <div>
                                <Label>City</Label>
                                <Select name="city_id" value={formData.city_id} onChange={handleChange}>
                                    <option value="">Select City</option>
                                    {metadata.cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </Select>
                            </div>
                          </div>

                          <div><Label>Pincode</Label><Input name="pincode" value={formData.pincode} onChange={handleChange} /></div>
                          <div><Label>Landmark</Label><Input name="landmark" value={formData.landmark} onChange={handleChange} /></div>
                          <div className="md:col-span-2"><Label>Maps Navigation URL</Label><Input name="address_url" value={formData.address_url} onChange={handleChange} /></div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                        <Info size={14}/> Editorial Content
                       </h3>
                       <div className="space-y-4">
                          <div><Label>One-Line Summary</Label><textarea name="short_description" value={formData.short_description} onChange={handleChange} rows="2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500" /></div>
                          <div><Label>Detailed Biography</Label><textarea name="long_description" value={formData.long_description} onChange={handleChange} rows="6" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500" /></div>
                       </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Operational & Admin */}
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                    <Clock size={14}/> Operational Data
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Opens At</Label><Input type="time" name="open_time" value={formData.open_time} onChange={handleChange} /></div>
                    <div><Label>Closes At</Label><Input type="time" name="close_time" value={formData.close_time} onChange={handleChange} /></div>
                </div>
                <div><Label>Entry Fee (INR)</Label><Input type="number" name="visit_price" value={formData.visit_price} onChange={handleChange} /></div>
                <div><Label>Public Contact</Label><Input name="mobile_number" value={formData.mobile_number} onChange={handleChange} /></div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                    <ShieldCheck size={14}/> Admin Authority
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>First Name</Label><Input name="admin_first_name" value={formData.admin_first_name} onChange={handleChange} /></div>
                    <div><Label>Last Name</Label><Input name="admin_last_name" value={formData.admin_last_name} onChange={handleChange} /></div>
                </div>
                <div><Label>Admin Mobile</Label><Input name="admin_mobile" value={formData.admin_mobile} onChange={handleChange} /></div>
                <div><Label>Admin Email</Label><Input name="admin_email" value={formData.admin_email} onChange={handleChange} /></div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl space-y-6 text-white">
                <h3 className="flex items-center gap-2 text-indigo-400 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-white/10">
                    <Tag size={14}/> Indexing & Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Sequence</Label><Input name="sequence" value={formData.sequence} onChange={handleChange} style={{background: '#1e293b', border: '1px solid #334155', color: 'white'}} /></div>
                    <div><Label>Training</Label><Input name="training_sequence" value={formData.training_sequence} onChange={handleChange} style={{background: '#1e293b', border: '1px solid #334155', color: 'white'}} /></div>
                </div>
                <div>
                    <Label>Profile Status</Label>
                    <Select name="status" value={formData.status} onChange={handleChange} style={{background: '#1e293b', border: '1px solid #334155', color: 'white'}}>
                        <option value={1}>ACTIVE</option>
                        <option value={0}>INACTIVE</option>
                    </Select>
                </div>
              </div>
            </div>
          </div>

          {/* RESPONSIVE FLOATING ACTION BAR */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50">
             <div className="bg-white/80 backdrop-blur-2xl border border-slate-200 rounded-[2rem] shadow-2xl p-3 md:p-4 flex flex-col md:flex-row items-center gap-4 px-6 md:px-8">
                
                {/* Unsaved Changes Indicator - Full Responsive */}
                <div className="flex items-center gap-3 w-full md:w-auto border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-8">
                   <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                      <AlertCircle size={20} />
                   </div>
                   <div className="overflow-hidden">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Unsaved Changes</p>
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[180px] md:max-w-[240px]">
                        {formData.name || 'Editing Profile...'}
                      </p>
                   </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3 w-full md:w-auto ml-auto">
                   <button 
                      type="button" 
                      onClick={() => navigate(-1)} 
                      className="flex-1 md:flex-none px-6 py-3.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                   >
                      Cancel
                   </button>
                   <button 
                      type="submit" 
                      disabled={loading} 
                      className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                   >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                      <span>Save Profile</span>
                   </button>
                </div>

             </div>
          </div>
        </form>
      </div>
    </div>
  );
}