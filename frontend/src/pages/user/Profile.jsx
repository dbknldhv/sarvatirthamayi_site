import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiPhone, FiShield, FiEdit2, FiCheck, FiArrowLeft, FiCamera, FiImage, FiCalendar, FiDownload, FiMapPin } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../api/api';
import { getFullImageUrl } from '../../utils/config';

const UserProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New States for Bookings
  const [bookings, setBookings] = useState([]);
  const [fetchingBookings, setFetchingBookings] = useState(true);
  
  const profileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
  });

  const [previews, setPreviews] = useState({
    profile: null,
    banner: "/assets/banner-bg.png",
  });

  const [files, setFiles] = useState({ profile: null, banner: null });
  const [errors, setErrors] = useState({});

  // SYNC WITH DB FIELDS & FETCH BOOKINGS
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        mobile: user.mobile_number || '', 
      });
      setPreviews({
        profile: user.profile_picture ? getFullImageUrl(user.profile_picture) : null,
        banner: user.banner_image ? getFullImageUrl(user.banner_image) : "/assets/banner-bg.png",
      });
      fetchUserBookings();
    }
  }, [user]);

  const fetchUserBookings = async () => {
    try {
      setFetchingBookings(true);
      const res = await api.get('/user/my-temple-bookings');
      setBookings(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setFetchingBookings(false);
    }
  };

  const handleDownloadTicket = (ticketPath) => {
    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");
    const cleanPath = ticketPath.startsWith("/") ? ticketPath : `/${ticketPath}`;
    window.open(`${baseUrl}${cleanPath}`, "_blank");
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
      setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
    }
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First name required";
    if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = "Valid 10-digit mobile required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const data = new FormData();
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('mobile', formData.mobile);
      
      if (files.profile) data.append('profileImage', files.profile);
      if (files.banner) data.append('bannerImage', files.banner);

      const res = await api.put('/user/update-profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setIsModalOpen(false);
        alert("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Update failed", err);
      alert(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar />
      
      <main className="max-w-4xl mx-auto pt-24 md:pt-32 pb-12 px-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-purple-600 mb-6 font-medium transition-colors">
          <FiArrowLeft /> Back to Home
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
          
          <div className="h-40 md:h-56 relative overflow-hidden bg-slate-200">
             <img src={previews.banner} className="w-full h-full object-cover" alt="Banner" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50"></div>
          </div>
          
          <div className="px-6 md:px-12 pb-10">
            <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-20 md:-mt-24 mb-8">
              <div className="w-36 h-36 md:w-44 md:h-44 bg-white dark:bg-slate-800 rounded-[2.5rem] border-8 border-white dark:border-slate-900 flex items-center justify-center shadow-2xl overflow-hidden relative group">
                {previews.profile ? (
                    <img src={previews.profile} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-5xl font-bold text-purple-600">{user?.first_name?.charAt(0)}</span>
                )}
              </div>
              
              <div className="text-center md:text-left flex-1 pb-4">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center md:justify-start gap-2">
                  <FiShield /> Verified Member
                </p>
              </div>

              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg mb-4">
                <FiEdit2 /> Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                <InfoTile icon={<FiMail />} label="Email Address" value={user?.email} verified />
                <InfoTile icon={<FiPhone />} label="Phone Number" value={user?.mobile_number || "Not linked"} />
            </div>

            {/* NEW: BOOKING HISTORY SECTION */}
            <div className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white px-2">My Sacred Visits</h2>
                
                {fetchingBookings ? (
                    <div className="flex justify-center p-12">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-purple-600 text-3xl">
                            <FiCalendar />
                        </motion.div>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-slate-400 font-bold">No temple visits booked yet.</p>
                        <button onClick={() => navigate('/user/temples')} className="text-purple-600 font-black mt-2 hover:underline">Book your first visit</button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {bookings.map((booking) => (
                            <div key={booking._id} className="group flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-purple-500/50 transition-all">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                        <FiCalendar size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-900 dark:text-white">{booking.temple_id?.name || "Temple Visit"}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <FiCalendar /> {new Date(booking.date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <FiMapPin /> {booking.temple_id?.location || "Sacred Site"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                    <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg font-black uppercase">Confirmed</span>
                                    {booking.ticket_url && (
                                        <button 
                                            onClick={() => handleDownloadTicket(booking.ticket_url)}
                                            className="flex items-center gap-2 ml-auto md:ml-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-md"
                                        >
                                            <FiDownload /> Ticket
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
              <div className="h-32 relative bg-slate-200">
                <img src={previews.banner} className="w-full h-full object-cover opacity-60" alt="banner preview" />
                <button onClick={() => bannerInputRef.current.click()} className="absolute inset-0 m-auto w-fit h-fit bg-black/50 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md hover:bg-black/70 transition-all">
                  <FiImage /> Change Banner
                </button>
                <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
              </div>

              <div className="p-8 pt-0">
                <div className="relative -mt-12 mb-6 flex justify-center">
                    <div className="relative group">
                       <div className="w-24 h-24 rounded-[1.5rem] border-4 border-white dark:border-slate-900 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-xl">
                         <img src={previews.profile} className="w-full h-full object-cover" alt="preview" />
                       </div>
                       <button onClick={() => profileInputRef.current.click()} className="absolute -bottom-2 -right-2 p-2 bg-purple-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                         <FiCamera size={16} />
                       </button>
                       <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <ModalInput label="First Name" value={formData.first_name} onChange={(v) => setFormData({...formData, first_name: v})} error={errors.first_name} />
                    <ModalInput label="Last Name" value={formData.last_name} onChange={(v) => setFormData({...formData, last_name: v})} />
                </div>
                <ModalInput label="Mobile Number" icon={<FiPhone size={14}/>} value={formData.mobile} onChange={(v) => setFormData({...formData, mobile: v})} error={errors.mobile} />

                <div className="mt-8 flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleSave} disabled={loading} className="flex-[2] bg-purple-600 text-white py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg">
                    {loading ? "Updating..." : <><FiCheck /> Save Changes</>}
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

const InfoTile = ({ icon, label, value, verified }) => (
    <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
        <div className="text-purple-600 dark:text-purple-400 text-xl">{icon}</div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="font-bold dark:text-white truncate max-w-[150px]">{value}</p>
        </div>
        {verified && <span className="ml-auto text-[9px] bg-green-500/10 text-green-500 px-2 py-1 rounded-lg font-black uppercase">Verified</span>}
    </div>
);

const ModalInput = ({ label, value, onChange, error, icon }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-tighter">{label}</label>
        <div className={`flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 transition-all ${error ? 'border-red-500' : 'border-transparent focus-within:border-purple-500'}`}>
            {icon && <span className="text-slate-400">{icon}</span>}
            <input className="bg-transparent w-full focus:outline-none dark:text-white font-bold text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
        {error && <p className="text-red-500 text-[10px] font-bold ml-2">{error}</p>}
    </div>
);

export default UserProfile;