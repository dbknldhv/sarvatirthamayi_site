import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiPhone, FiShield, FiEdit2, FiCheck, FiArrowLeft, FiCamera, FiImage, FiCalendar, FiDownload, FiMapPin, FiUser, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../api/api';
import { getFullImageUrl } from '../../utils/config';
import { toast, Toaster } from 'react-hot-toast';

const UserProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [fetchingBookings, setFetchingBookings] = useState(true);
  
  const profileInputRef = useRef(null);
  const bannerInputRef = useRef(null); 

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '',
    date_of_birth: '',
    gender: '1',
  });

  const [previews, setPreviews] = useState({ profile: null, banner: null });
  const [files, setFiles] = useState({ profile: null, banner: null });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        mobile_number: user.mobile_number || '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
        gender: String(user.gender || "1"),
      });
      setPreviews({ 
        profile: user.profile_picture ? getFullImageUrl(user.profile_picture) : null,
        banner: user.banner_image ? getFullImageUrl(user.banner_image) : "/assets/banner-bg.png" 
      });
      fetchUserBookings();
    }
  }, [user]);

  const fetchUserBookings = async () => {
    try {
      setFetchingBookings(true);
      const res = await api.get(`/user/my-temple-bookings?_t=${new Date().getTime()}`);
      let fetchedData = res.data?.data?.data || res.data?.data || res.data?.bookings || res.data;
      setBookings(Array.isArray(fetchedData) ? fetchedData : []);
    } catch (err) { setBookings([]); }
    finally { setFetchingBookings(false); }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
      setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      
      // Attach the files if they exist
      if (files.profile) data.append('profile_picture', files.profile);
      if (files.banner) data.append('banner_image', files.banner);

      // We let Axios auto-generate the boundary header for FormData
      const res = await api.put('/user/update-profile', data);
      
      if (res.data.success || res.data.status === "true") {
        const updatedUser = res.data.data || res.data.user;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setIsModalOpen(false);
        toast.success("Profile Updated Successfully");
      }
    } catch (err) { toast.error("Failed to update profile"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors relative">
      <Navbar />
      <Toaster position="top-right" />
      
      <main className="max-w-5xl mx-auto pt-28 px-4 pb-20">
        <button onClick={() => navigate('/')} className="text-slate-400 flex items-center gap-2 mb-8 hover:text-purple-600 transition-colors">
          <FiArrowLeft /> Back to Dashboard
        </button>

        <section className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="h-40 md:h-56 relative overflow-hidden bg-slate-200">
                <img src={previews.banner} className="w-full h-full object-cover" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50"></div>
            </div>

            <div className="px-8 pb-8">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 -mt-16 md:-mt-20 mb-8 relative z-10">
                    <div className="w-36 h-36 rounded-3xl bg-slate-200 overflow-hidden shadow-2xl border-4 border-white dark:border-slate-900">
                        <img src={previews.profile || "/avatar-placeholder.png"} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center md:text-left flex-1 pb-4">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">{user?.first_name} {user?.last_name}</h1>
                        <p className="text-purple-600 font-bold flex items-center gap-2 justify-center md:justify-start">
                            <FiShield size={16}/> Verified Member
                        </p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="md:ml-auto bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-purple-600 transition-all flex items-center gap-2 shadow-lg mb-4">
                        <FiEdit2 /> Edit Details
                    </button>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    <StatsTile label="Visits" value={bookings.length} />
                    <StatsTile label="Membership" value="Active" color="text-emerald-500" />
                    <StatsTile label="Gender" value={formData.gender === '1' ? 'Male' : formData.gender === '2' ? 'Female' : 'Other'} />
                    <StatsTile label="DOB" value={formData.date_of_birth || "N/A"} />
                </div>
            </div>
        </section>
      </main>

      <AnimatePresence>
        {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] relative shadow-2xl overflow-hidden">
                    
                    <div className="h-32 relative bg-slate-200">
                        <img src={previews.banner} className="w-full h-full object-cover opacity-70" alt="banner preview" />
                        <button onClick={() => bannerInputRef.current.click()} className="absolute inset-0 m-auto w-fit h-fit bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md hover:bg-black/80 transition-all shadow-xl">
                            <FiImage /> Change Banner
                        </button>
                        <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                    </div>

                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 z-20 text-white bg-black/30 p-2 rounded-full hover:bg-black/60 transition-colors"><FiX size={20}/></button>
                    
                    <div className="p-8 pt-0">
                        <div className="relative -mt-12 mb-6 flex justify-center">
                            <div className="relative w-24 h-24">
                                <img src={previews.profile || "/avatar-placeholder.png"} className="w-full h-full rounded-2xl object-cover bg-slate-200 border-4 border-white dark:border-slate-900 shadow-xl" />
                                <button onClick={() => profileInputRef.current.click()} className="absolute -bottom-2 -right-2 p-2 bg-purple-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                                    <FiCamera size={16} />
                                </button>
                                <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="First Name" value={formData.first_name} onChange={(v) => setFormData({...formData, first_name: v})} />
                                <InputField label="Last Name" value={formData.last_name} onChange={(v) => setFormData({...formData, last_name: v})} />
                            </div>
                            <InputField label="Mobile" value={formData.mobile_number} onChange={(v) => setFormData({...formData, mobile_number: v})} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField type="date" label="DOB" value={formData.date_of_birth} onChange={(v) => setFormData({...formData, date_of_birth: v})} />
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Gender</label>
                                    <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                                        <option value="1">Male</option>
                                        <option value="2">Female</option>
                                        <option value="3">Other</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black mt-4 hover:bg-purple-700 shadow-lg">
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatsTile = ({ label, value, color = "text-slate-900" }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{label}</p>
        <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
    </div>
);

const InputField = ({ label, value, onChange, type = "text" }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{label}</label>
        <input type={type} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
);

export default UserProfile;