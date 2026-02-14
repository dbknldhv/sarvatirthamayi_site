import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService } from "../../../services/userService";
import { getFullImageUrl } from "../../../utils/config";
import { toast } from "react-hot-toast";
import { User as UserIcon, Loader2, Calendar } from "lucide-react";

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    date_of_birth: "",
    gender: "1",
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userService.getUserById(id);
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          mobile_number: data.mobile_number || "",
          date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : "",
          gender: String(data.gender || "1"),
        });

        if (data.profile_picture) {
          setImagePreview(getFullImageUrl(data.profile_picture));
        }
      } catch (error) {
        toast.error("Error loading user data");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("File size exceeds 5MB");
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (selectedFile) data.append("profile_picture", selectedFile);

    try {
      await userService.updateUser(id, data);
      toast.success("User Profile Updated Successfully!");
      setTimeout(() => navigate("/admin/user/list"), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC]">
      <Loader2 className="animate-spin text-[#6366F1]" size={32} />
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-[#F8F9FC] min-h-screen font-sans">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-6">
        <span className="hover:text-[#6366F1] cursor-pointer" onClick={() => navigate("/admin/user/list")}>Users</span>
        <span>&gt;</span>
        <span className="text-gray-500 font-medium">Edit</span>
      </div>

      <div className="max-w-[1200px] mx-auto bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-[17px] font-semibold text-[#858796]">User Profile</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
          
          {/* Photo Upload Section */}
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 bg-[#E3E6F0] rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={48} className="text-white" />
              )}
            </div>
            <div className="pt-2">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()}
                className="bg-[#6366F1] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#4E73DF] transition-colors mb-2"
              >
                Upload new photo
              </button>
              <p className="text-xs text-gray-400 font-normal">Allowed JPG or PNG. Max size of 5MB</p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight ml-1">First Name</label>
              <input 
                className="w-full border border-gray-200 rounded-md p-2.5 text-sm text-gray-600 outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight ml-1">Last Name</label>
              <input 
                className="w-full border border-gray-200 rounded-md p-2.5 text-sm text-gray-600 outline-none focus:border-[#6366F1] transition-all"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              />
            </div>

            {/* E-Mail */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight ml-1">E-Mail</label>
              <input 
                type="email"
                className="w-full border border-gray-200 rounded-md p-2.5 text-sm text-gray-600 outline-none focus:border-[#6366F1] transition-all"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight ml-1">Phone Number</label>
              <div className="relative">
                <input 
                  className="w-full border border-gray-200 rounded-md p-2.5 text-sm text-gray-600 outline-none focus:border-[#6366F1] transition-all placeholder-gray-400"
                  value={formData.mobile_number}
                  placeholder="IN (+91) 9988776655"
                  onChange={(e) => setFormData({...formData, mobile_number: e.target.value})}
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight ml-1">Date of Birth</label>
              <div className="relative">
                <input 
                  type="date"
                  className="w-full border border-gray-200 rounded-md p-2.5 text-sm text-gray-600 outline-none focus:border-[#6366F1] transition-all uppercase"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight ml-1">Gender</label>
              <select 
                className="w-full border border-gray-200 rounded-md p-2.5 text-sm text-gray-600 outline-none focus:border-[#6366F1] transition-all bg-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="1">Male</option>
                <option value="2">Female</option>
                <option value="3">Other</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-3">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-[#6366F1] text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-[#4E73DF] transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : null}
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button 
              type="button" 
              onClick={() => navigate("/admin/user/list")} 
              className="bg-gray-50 border border-gray-200 text-gray-500 px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;