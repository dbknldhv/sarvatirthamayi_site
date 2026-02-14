import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, Edit, Trash2, Search, Loader2, 
  ChevronLeft, ChevronRight, UserPlus, Mail, Phone
} from "lucide-react";
import { userService } from "../../../services/userService";
import { toast } from "react-hot-toast";

const UsersList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const pendingDeletes = useRef({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    return () => Object.values(pendingDeletes.current).forEach(clearTimeout);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
      const mobile = user.mobile_number || "";
      const email = user.email || "";
      const query = searchQuery.toLowerCase();
      const matchesSearch = fullName.includes(query) || mobile.includes(query) || email.includes(query);
      const matchesType = userTypeFilter === "" || String(user.user_type) === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [users, searchQuery, userTypeFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentTableData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, userTypeFilter]);

  const handleDelete = (id) => {
    const userToDelete = users.find((u) => u._id === id);
    const originalUsers = [...users];
    setUsers(prev => prev.filter(u => u._id !== id));
    const timer = setTimeout(async () => {
      try {
        await userService.deleteUser(id);
        delete pendingDeletes.current[id];
      } catch (err) {
        toast.error("Server error");
        setUsers(originalUsers);
      }
    }, 5000);
    pendingDeletes.current[id] = timer;
    toast((t) => (
      <div className="flex items-center gap-3 text-sm">
        <span>User <b>{userToDelete?.first_name}</b> deleted</span>
        <button onClick={() => {
            clearTimeout(pendingDeletes.current[id]);
            setUsers(originalUsers);
            toast.dismiss(t.id);
          }} className="bg-indigo-600 text-white px-3 py-1 rounded-md font-bold uppercase text-[10px]">Undo</button>
      </div>
    ), { duration: 5000, id: `delete-${id}` });
  };

  const UserBadge = ({ type }) => {
    const styles = { 1: "bg-purple-100 text-purple-700", 2: "bg-blue-100 text-blue-700", 3: "bg-emerald-100 text-emerald-700" };
    const labels = { 1: 'Super Admin', 2: 'Temple Admin', 3: 'User' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles[type]}`}>{labels[type]}</span>;
  };

  return (
    <div className="p-4 md:p-8 bg-[#F3F4F6] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Total Records: {filteredUsers.length}</p>
        </div>
         {/*<button onClick={() => navigate('/admin/user/add')} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200 transition-all">
          <UserPlus size={18} /> Add User
        </button> */}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
          placeholder="Search name, email or mobile..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-medium text-slate-600" value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="1">Super Admin</option>
          <option value="2">Temple Admin</option>
          <option value="3">User</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Contact Information</th>
                  <th className="px-6 py-4 text-center">Assigned Role</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {currentTableData.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {user.first_name?.[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-700 capitalize text-sm">{user.first_name} {user.last_name || ""}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1"><Mail size={10}/> {user.email || 'No email provided'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-slate-600 font-mono text-sm flex items-center gap-2">
                         <Phone size={14} className="text-slate-400"/> {user.mobile_number}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <UserBadge type={user.user_type} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => navigate(`/admin/user/view/${user._id}`)} title="View Profile" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye size={18}/></button>
                        <button onClick={() => navigate(`/admin/user/edit/${user._id}`)} title="Edit User" className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit size={18}/></button>
                        <button onClick={() => handleDelete(user._id)} title="Delete User" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {currentTableData.map((user) => (
              <div key={user._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">{user.first_name?.[0]}</div>
                    <div>
                      <h3 className="font-bold text-slate-800 capitalize">{user.first_name} {user.last_name || ""}</h3>
                      <UserBadge type={user.user_type} />
                    </div>
                  </div>
                </div>
                <div className="text-[12px] space-y-2 mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600"><Mail size={14} className="text-slate-400"/> {user.email || 'N/A'}</div>
                  <div className="flex items-center gap-2 text-slate-600 font-mono"><Phone size={14} className="text-slate-400"/> {user.mobile_number}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/admin/user/view/${user._id}`)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] uppercase tracking-wider">View</button>
                  <button onClick={() => navigate(`/admin/user/edit/${user._id}`)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] uppercase tracking-wider">Edit</button>
                  <button onClick={() => handleDelete(user._id)} className="px-4 bg-red-50 text-red-500 rounded-xl border border-red-100"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-3">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2.5 rounded-xl bg-white border shadow-sm disabled:opacity-30 transition-opacity"><ChevronLeft size={20}/></button>
              <div className="flex items-center px-4 font-bold text-sm text-slate-500 bg-white border rounded-xl shadow-sm">Page {currentPage} of {totalPages}</div>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2.5 rounded-xl bg-white border shadow-sm disabled:opacity-30 transition-opacity"><ChevronRight size={20}/></button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsersList;