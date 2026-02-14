import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService } from "../../../services/userService";
import { getFullImageUrl } from "../../../utils/config";
import { 
  ArrowLeft, Mail, Phone, User as UserIcon, 
  ShieldCheck, Activity, Calendar, Edit3
} from "lucide-react";

const ViewUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userService.getUserById(id);
        setUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC]">
      <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <div className="p-10 text-center text-red-500 font-medium">User not found.</div>;

  return (
    <div className="p-4 md:p-8 bg-[#F8F9FC] min-h-screen font-sans">
      {/* Breadcrumb / Back Navigation */}
      <button 
        onClick={() => navigate("/admin/user/list")} 
        className="flex items-center gap-2 text-gray-400 hover:text-[#6366F1] mb-6 transition-colors text-xs"
      >
        <ArrowLeft size={14} /> 
        <span className="font-medium text-gray-500">Users &gt; View Profile</span>
      </button>

      <div className="max-w-[1200px] mx-auto bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-[17px] font-semibold text-[#858796]">User Profile</h2>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.status === 'inactive' ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
            {user.status || 'Active'}
          </span>
        </div>

        {/* Profile Info Section */}
        <div className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
            {/* Profile Picture */}
            <div className="w-32 h-32 bg-[#E3E6F0] rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 shadow-sm">
              {user.profile_picture ? (
                <img src={getFullImageUrl(user.profile_picture)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={56} className="text-white" />
              )}
            </div>

            {/* Basic Identity */}
            <div className="text-center md:text-left pt-2">
              <h1 className="text-2xl font-bold text-gray-700 capitalize mb-2">
                {user.first_name} {user.last_name || ''}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium">
                <div className="flex items-center gap-2 text-gray-500">
                  <ShieldCheck size={16} className="text-[#6366F1]" />
                  <span>{user.user_type === 1 ? 'Super Admin' : user.user_type === 2 ? 'Temple Admin' : 'Registered User'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Activity size={16} className="text-[#6366F1]" />
                  <span>ID: {user._id?.substring(user._id.length - 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 mb-10" />

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            {/* Column 1 */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-bold text-[#6366F1] uppercase tracking-widest border-b border-indigo-50 pb-2">Basic Details</h3>
              
              <InfoField label="Full Name" value={`${user.first_name} ${user.last_name || '-'}`} />
              <InfoField label="Email Address" value={user.email || 'N/A'} icon={<Mail size={14}/>} />
              <InfoField label="Gender" value={user.gender === 1 ? 'Male' : user.gender === 2 ? 'Female' : 'Other'} />
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-bold text-[#6366F1] uppercase tracking-widest border-b border-indigo-50 pb-2">Contact & Personal</h3>
              
              <InfoField label="Mobile Number" value={user.mobile_number ? `+${user.mobile_number}` : 'N/A'} icon={<Phone size={14}/>} />
              <InfoField label="Date of Birth" value={user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('en-GB') : 'N/A'} icon={<Calendar size={14}/>} />
              <InfoField label="Account Type" value={user.user_type === 1 ? 'Administrator' : 'General User'} />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => navigate(`/admin/user/edit/${user._id}`)}
              className="bg-[#6366F1] text-white px-8 py-2.5 rounded-md text-sm font-medium hover:bg-[#4E73DF] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Edit3 size={16} /> Edit Profile
            </button>
            <button 
              onClick={() => navigate("/admin/user/list")}
              className="bg-white border border-gray-200 text-gray-500 px-8 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-all text-center"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for uniform field display
const InfoField = ({ label, value, icon }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight ml-0.5">{label}</p>
    <div className="flex items-center gap-2 bg-gray-50/50 p-2.5 rounded-md border border-gray-100">
      {icon && <span className="text-[#6366F1]">{icon}</span>}
      <p className="text-sm font-semibold text-gray-600">{value}</p>
    </div>
  </div>
);

export default ViewUser;