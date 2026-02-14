import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCloudUploadAlt, FaMapMarkerAlt, FaInfoCircle, FaHome, FaRegFileImage, FaAlignLeft } from 'react-icons/fa';

// API and Services
import api from '../../../api/api';
import { DonationService } from '../../../services/donationService';
import { getFullImageUrl } from '../../../utils/config';

const EditDonation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Dropdown States
  const [temples, setTemples] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    temple_id: '',
    name: '',
    status: 1, 
    mobile_number: '',
    sequence: '',
    short_description: '',
    long_description: '',
    address_line_1: '',
    address_line_2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: '', 
    latitude: '',
    longitude: '',
    address_url: ''
  });

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch all dropdowns and the specific donation record
        const [templeRes, countryRes, stateRes, cityRes, donationData] = await Promise.all([
          api.get('/admin/temples').catch(() => ({ data: { temples: [] } })),
          api.get('/admin/countries').catch(() => ({ data: { countries: [] } })),
          api.get('/admin/states').catch(() => ({ data: { states: [] } })),
          api.get('/admin/cities').catch(() => ({ data: { cities: [] } })),
          DonationService.getById(id)
        ]);
        
        setTemples(templeRes.data?.temples || []);
        setCountriesList(countryRes.data?.countries || []);
        setStatesList(stateRes.data?.states || []);
        setCitiesList(cityRes.data?.cities || []);

        if (donationData) {
          setFormData({
            temple_id: donationData.temple_id || '',
            name: donationData.name || '',
            status: donationData.status ?? 1,
            mobile_number: donationData.mobile_number || '',
            sequence: donationData.sequence || '',
            short_description: donationData.short_description || '',
            long_description: donationData.long_description || '',
            address_line_1: donationData.address_line_1 || '',
            address_line_2: donationData.address_line_2 || '',
            landmark: donationData.landmark || '',
            city: donationData.city || '',
            state: donationData.state || '',
            pincode: donationData.pincode || '',
            country: donationData.country || '',
            latitude: donationData.latitude || '',
            longitude: donationData.longitude || '',
            address_url: donationData.address_url || ''
          });

          if (donationData.image) {
            setImagePreview(getFullImageUrl(donationData.image));
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setFetching(false);
      }
    };
    initializeData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (imageFile) data.append('image', imageFile);

    try {
      await DonationService.update(id, data);
      navigate('/admin/donation');
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating donation');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-20 text-center font-bold text-slate-400">Loading details...</div>;

  return (
    <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button type="button" onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm hover:text-indigo-600 transition-all">
            <FaArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-black text-slate-800">Edit Donation</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 space-y-8">
            
            {/* General Information */}
            <div>
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaInfoCircle />
                <h2 className="text-xs font-black uppercase tracking-widest">General Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block">Temple</label>
                  <select name="temple_id" value={formData.temple_id} onChange={handleChange} required className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none">
                    <option value="">Select Temple</option>
                    {temples.map((t, idx) => (
                      <option key={t._id || idx} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Donor Name" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                
                <select name="status" value={formData.status} onChange={handleChange} className="bg-slate-50 rounded-xl p-3 text-sm outline-none">
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>

                <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleChange} placeholder="Mobile Number" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <input type="number" name="sequence" value={formData.sequence} onChange={handleChange} placeholder="Sequence" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
              </div>
            </div>

            {/* Descriptions */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaAlignLeft />
                <h2 className="text-xs font-black uppercase tracking-widest">Descriptions</h2>
              </div>
              <div className="space-y-4">
                <input type="text" name="short_description" value={formData.short_description} onChange={handleChange} placeholder="Short Description" className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <textarea name="long_description" value={formData.long_description} onChange={handleChange} placeholder="Long Description" rows="4" className="w-full bg-slate-50 rounded-xl p-3 text-sm outline-none resize-none"></textarea>
              </div>
            </div>

            {/* Address Details */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaHome />
                <h2 className="text-xs font-black uppercase tracking-widest">Address Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} placeholder="Address Line 1" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} placeholder="Address Line 2" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <input type="text" name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Landmark" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />

                <select name="country" value={formData.country} onChange={handleChange} className="bg-slate-50 rounded-xl p-3 text-sm outline-none">
                  <option value="">Select Country</option>
                  {countriesList.map((c, idx) => (
                    <option key={c._id || idx} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <select name="state" value={formData.state} onChange={handleChange} className="bg-slate-50 rounded-xl p-3 text-sm outline-none">
                  <option value="">Select State</option>
                  {statesList.map((s, idx) => (
                    <option key={s._id || idx} value={s.name}>{s.name}</option>
                  ))}
                </select>

                <select name="city" value={formData.city} onChange={handleChange} className="bg-slate-50 rounded-xl p-3 text-sm outline-none md:col-span-2">
                  <option value="">Select City</option>
                  {citiesList.map((c, idx) => (
                    <option key={c._id || idx} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location & Map */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaMapMarkerAlt />
                <h2 className="text-xs font-black uppercase tracking-widest">Map & Location</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitude" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitude" className="bg-slate-50 rounded-xl p-3 text-sm outline-none" />
                <input type="text" name="address_url" value={formData.address_url} onChange={handleChange} placeholder="Google Maps URL" className="md:col-span-2 bg-slate-50 rounded-xl p-3 text-sm outline-none" />
              </div>
            </div>

            {/* Image Upload Area */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaRegFileImage />
                <h2 className="text-xs font-black uppercase tracking-widest">Files</h2>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-8 pt-4">
                <div className="relative w-full md:w-1/2 h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:border-indigo-400 cursor-pointer transition-all">
                  <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FaCloudUploadAlt className="text-slate-300" size={28} />
                  <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Update Photo</span>
                </div>
                {imagePreview && (
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="p-6 bg-slate-50 flex justify-end gap-4">
            <button type="button" onClick={() => navigate(-1)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all">
              {loading ? 'Updating...' : 'Update Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDonation;