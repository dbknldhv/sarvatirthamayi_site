import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { templeService } from "../../../services/templeService";
import { 
  Save, Loader2, Camera, MapPin, Clock, 
  Info, X, Sparkles, ChevronRight, Phone, Shield, Search
} from "lucide-react";

// --- Shared UI Components ---
const Label = ({ children, required }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2.5 block italic">
    {children} {required && <span className="text-rose-500">*</span>}
  </label>
);

const Input = (props) => (
  <input 
    {...props} 
    className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300" 
  />
);

const Select = ({ options = [], ...props }) => {
  const uniqueOptions = Array.from(new Map(options.map(item => [item._id || item.id, item])).values());
  return (
    <div className="relative">
      <select 
        {...props} 
        className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
      >
        <option value="">{props.placeholder || "Select Option"}</option>
        {uniqueOptions.map((opt, index) => (
          <option key={`${opt._id || opt.id}-${index}`} value={opt._id || opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronRight size={14} className="rotate-90" />
      </div>
    </div>
  );
};

export default function AddTemple() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [metadata, setMetadata] = useState({ countries: [], states: [], cities: [] });

  const [formData, setFormData] = useState({
    name: "", status: "1", short_description: "", long_description: "",
    mobile_number: "", email: "", open_time: "", close_time: "", visit_price: "",
    address_line1: "", address_line2: "", landmark: "",
    country_id: "696c6d7e5061dc0ec0cc7627", state_id: "", city_id: "", pincode: "",
    latitude: "", longitude: "", address_url: "", sequence: "", training_sequence: "",
    admin_first_name: "", admin_last_name: "", admin_email: "", admin_mobile: "", admin_password: ""
  });

  // Helper: Extract Coordinates from Google Maps URL
  const extractCoords = (url) => {
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) {
      return { lat: match[1], lng: match[2] };
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const [countryData, stateData] = await Promise.all([
          templeService.getCountries(),
          templeService.getStates()
        ]);
        if (isMounted) setMetadata(prev => ({ ...prev, countries: countryData, states: stateData }));
      } catch (err) { console.error("Metadata Load Error:", err); }
    };
    loadInitialData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!formData.state_id) {
      setMetadata(prev => ({ ...prev, cities: [] }));
      return;
    }
    const loadCities = async () => {
      try {
        const cityData = await templeService.getCities(formData.state_id);
        setMetadata(prev => ({ ...prev, cities: cityData }));
      } catch (err) { console.error("City Fetch Error:", err); }
    };
    loadCities();
  }, [formData.state_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-detect Coordinates if URL is pasted
    if (name === "address_url" && value.includes("google.com/maps")) {
      const coords = extractCoords(value);
      if (coords) {
        setFormData(prev => ({ ...prev, address_url: value, latitude: coords.lat, longitude: coords.lng }));
        return;
      }
    }

    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      ...(name === "state_id" ? { city_id: "" } : {}) 
    }));
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
    
    if (!formData.name || !formData.state_id || !formData.city_id || !formData.admin_email) {
      alert("Please fill in required fields (Name, State, City, Admin Email).");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      
      Object.keys(formData).forEach(key => {
        let value = formData[key];

        // 1. SANITIZE STATUS: Ensure it's a Number (1 or 0)
        if (key === "status") {
          value = parseInt(value) || 1;
        }

        // 2. SANITIZE NUMERIC FIELDS: Strip units like "° N" or symbols
        const numericFields = ["latitude", "longitude", "visit_price", "sequence", "training_sequence"];
        if (numericFields.includes(key) && value) {
          // Removes everything except numbers, decimals, and negative signs
          value = value.toString().replace(/[^0-9.-]/g, "");
        }

        if (value !== "" && value !== null && value !== undefined) {
          data.append(key, value);
        }
      });

      if (image) data.append("image", image);

      await templeService.createTemple(data);
      alert("Temple Created Successfully!");
      navigate("/admin/temple");
    } catch (err) {
      const serverMsg = err.response?.data?.message || "Check numeric fields for correct formatting.";
      alert(`Create Failed: ${serverMsg}`);
      console.error("Backend Error:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10 bg-[#F8FAFC] min-h-screen pb-40 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Create Temple</h1>
          <button type="button" onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-12 space-y-12">
              
              {/* SECTION 1: TEMPLE IDENTITY */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                  <Info size={14}/> Temple Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-1"><Label required>Name</Label><Input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Golden Temple" /></div>
                  <div><Label>Status</Label><Select name="status" value={formData.status} onChange={handleChange} options={[{id: "1", name: "Active"}, {id: "0", name: "Inactive"}]} /></div>
                  <div className="md:col-span-2"><Label>Short Description</Label><textarea name="short_description" value={formData.short_description} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500" rows="2" /></div>
                  <div className="md:col-span-2"><Label>Long Description</Label><textarea name="long_description" value={formData.long_description} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500" rows="4" /></div>
                </div>
              </section>

              {/* SECTION 2: CONTACT & LOCATION */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                  <MapPin size={14}/> Location & Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><Label>Email</Label><Input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
                  <div><Label>Mobile Number</Label><Input name="mobile_number" value={formData.mobile_number} onChange={handleChange} /></div>
                  <div className="md:col-span-2"><Label>Address Line 1</Label><Input name="address_line1" value={formData.address_line1} onChange={handleChange} /></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
                    <div><Label>Country</Label><Select name="country_id" options={metadata.countries} value={formData.country_id} onChange={handleChange} /></div>
                    <div><Label required>State</Label><Select name="state_id" options={metadata.states} value={formData.state_id} onChange={handleChange} /></div>
                    <div><Label required>City</Label><Select name="city_id" options={metadata.cities} value={formData.city_id} onChange={handleChange} disabled={!formData.state_id} /></div>
                    <div><Label>Pincode</Label><Input name="pincode" value={formData.pincode} onChange={handleChange} /></div>
                  </div>
                </div>
              </section>

              {/* SECTION 3: MAPS DATA */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                   Map & Sequencing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label>Google Maps URL (Auto-Extracts Coords)</Label>
                    <div className="relative">
                       <Input name="address_url" placeholder="Paste link here..." value={formData.address_url} onChange={handleChange} />
                       <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    </div>
                  </div>
                  <div><Label>Latitude</Label><Input name="latitude" value={formData.latitude} onChange={handleChange} /></div>
                  <div><Label>Longitude</Label><Input name="longitude" value={formData.longitude} onChange={handleChange} /></div>
                  <div><Label>Sequence</Label><Input type="number" name="sequence" value={formData.sequence} onChange={handleChange} /></div>
                  <div><Label>Training Sequence</Label><Input type="number" name="training_sequence" value={formData.training_sequence} onChange={handleChange} /></div>
                </div>
              </section>

              {/* SECTION 4: ADMIN */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                  <Shield size={14}/> Admin Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><Label>First Name</Label><Input name="admin_first_name" value={formData.admin_first_name} onChange={handleChange} /></div>
                  <div><Label>Last Name</Label><Input name="admin_last_name" value={formData.admin_last_name} onChange={handleChange} /></div>
                  <div><Label required>Admin Email</Label><Input type="email" name="admin_email" value={formData.admin_email} onChange={handleChange} /></div>
                  <div><Label>Admin Mobile</Label><Input name="admin_mobile" value={formData.admin_mobile} onChange={handleChange} /></div>
                  <div className="md:col-span-2"><Label required>Admin Password</Label><Input type="password" name="admin_password" value={formData.admin_password} onChange={handleChange} /></div>
                </div>
              </section>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-2 border-b border-indigo-50">
                <Clock size={14}/> Operations
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Open Time</Label><Input type="time" name="open_time" value={formData.open_time} onChange={handleChange} /></div>
                <div><Label>Close Time</Label><Input type="time" name="close_time" value={formData.close_time} onChange={handleChange} /></div>
              </div>
              <Label>Visit Price (INR)</Label>
              <Input type="number" name="visit_price" value={formData.visit_price} onChange={handleChange} />
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <Label>Temple Image</Label>
              <div className="mt-4 border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center">
                {preview ? (
                  <div className="relative">
                    <img src={preview} className="w-full h-40 object-cover rounded-2xl mb-4" />
                    <button type="button" onClick={() => {setImage(null); setPreview(null);}} className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-rose-500 shadow-sm">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Camera className="mx-auto text-slate-300 mb-2" size={40} />
                )}
                <input type="file" onChange={handleImage} className="hidden" id="upload" accept="image/*" />
                <label htmlFor="upload" className="cursor-pointer text-[10px] font-bold text-indigo-600 underline uppercase tracking-widest block mt-2">Choose File</label>
              </div>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-white/90 backdrop-blur-md border border-slate-200 rounded-[2rem] p-4 shadow-2xl flex justify-between items-center px-10 z-50">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-500" size={18} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{formData.name || 'Drafting Temple...'}</span>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Create Temple
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}