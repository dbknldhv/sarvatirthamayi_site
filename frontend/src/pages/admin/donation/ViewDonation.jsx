import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FaArrowLeft, FaMapMarkerAlt, FaInfoCircle, FaHome, 
  FaRegFileImage, FaAlignLeft, FaPhoneAlt, FaExternalLinkAlt, FaHashtag
} from 'react-icons/fa';

// API and Services
import { DonationService } from '../../../services/donationService';
import { getFullImageUrl } from '../../../utils/config';

const ViewDonation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    const fetchDonationDetails = async () => {
      try {
        const data = await DonationService.getById(id);
        setDonation(data);
      } catch (err) {
        console.error("Error fetching donation details:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchDonationDetails();
  }, [id]);

  if (fetching) return <div className="p-20 text-center font-bold text-slate-400">Loading details...</div>;
  if (!donation) return <div className="p-20 text-center font-bold text-red-400">Donation not found.</div>;

  return (
    <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white rounded-xl shadow-sm hover:text-indigo-600 transition-all"
            >
              <FaArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-black text-slate-800">Donation Profile</h1>
          </div>
          <button 
            onClick={() => navigate(`/admin/donation/edit/${id}`)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all"
          >
            Edit Record
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Top Hero Section with Image */}
          <div className="relative h-72 bg-slate-900">
            <img 
              src={donation.image ? getFullImageUrl(donation.image) : 'https://via.placeholder.com/1200x600?text=Donor+Image'} 
              alt={donation.name}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute bottom-8 left-8 text-white">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${donation.status === 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {donation.status === 1 ? 'Active' : 'Inactive'}
                </span>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                  Sequence: {donation.sequence || '0'}
                </span>
              </div>
              <h2 className="text-4xl font-black">{donation.name}</h2>
              <p className="flex items-center gap-2 mt-2 opacity-90 font-medium">
                <FaPhoneAlt size={12} className="text-indigo-400"/> {donation.mobile_number || 'No Mobile Provided'}
              </p>
            </div>
          </div>

          <div className="p-8 space-y-10">
            
            {/* 1. General Info & Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-2 space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-indigo-600">
                    <FaAlignLeft />
                    <h2 className="text-xs font-black uppercase tracking-widest">Descriptions</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Short Summary</label>
                      <p className="text-slate-700 font-bold leading-relaxed">
                        {donation.short_description || 'No short description available.'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Full Details</label>
                      <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">
                        {donation.long_description || 'No detailed description available.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-indigo-600">
                    <FaInfoCircle />
                    <h2 className="text-xs font-black uppercase tracking-widest">System Info</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Temple ID</label>
                      <span className="text-xs font-mono text-slate-600">{donation.temple_id || 'N/A'}</span>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Database ID</label>
                      <span className="text-xs font-mono text-slate-600">{id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Address Details (Grid layout for all address fields) */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaHome />
                <h2 className="text-xs font-black uppercase tracking-widest">Address & Location</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Street Address</label>
                  <p className="text-sm text-slate-700 font-semibold leading-relaxed">
                    {donation.address_line_1} <br />
                    {donation.address_line_2}
                  </p>
                  {donation.landmark && (
                    <p className="text-xs text-indigo-500 mt-1 font-medium">Landmark: {donation.landmark}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">City & Pincode</label>
                  <p className="text-sm text-slate-700 font-semibold">{donation.city}</p>
                  <p className="text-sm text-slate-700 font-semibold">PIN: {donation.pincode}</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">State & Country</label>
                  <p className="text-sm text-slate-700 font-semibold">{donation.state}</p>
                  <p className="text-sm text-slate-700 font-semibold">{donation.country}</p>
                </div>
              </div>
            </div>

            {/* 3. Technical Mapping Fields */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FaMapMarkerAlt />
                <h2 className="text-xs font-black uppercase tracking-widest">Map & Coordinates</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Latitude</label>
                  <code className="text-indigo-600 font-bold">{donation.latitude || '0.0000'}</code>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Longitude</label>
                  <code className="text-indigo-600 font-bold">{donation.longitude || '0.0000'}</code>
                </div>
                
                {donation.address_url ? (
                  <a 
                    href={donation.address_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl text-xs font-bold uppercase hover:bg-indigo-600 transition-all shadow-lg"
                  >
                    Open Google Maps <FaExternalLinkAlt size={12}/>
                  </a>
                ) : (
                  <div className="text-[10px] font-bold text-slate-300 uppercase text-center italic">No Map URL provided</div>
                )}
              </div>
            </div>

          </div>

          {/* Footer Navigation */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase">
               <span>Created: {new Date(donation.createdAt || Date.now()).toLocaleDateString()}</span>
               <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
               <span>Updated: {new Date(donation.updatedAt || Date.now()).toLocaleDateString()}</span>
             </div>
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDonation;