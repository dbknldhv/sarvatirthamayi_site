import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Users, 
  Flame, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell 
} from "lucide-react";
import { authService } from "../../services/authService";

export default function TempleAdminDashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 🛡️ Safety Check for User Data
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("User data parse error", error);
      }
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    // No need to navigate here, authService.logout already handles redirection
  };

  const menuItems = [
    { name: "Overview", icon: <LayoutDashboard size={20} />, path: "/temple-admin/dashboard" },
    { name: "Ritual Bookings", icon: <CalendarCheck size={20} />, path: "/temple-admin/bookings" },
    { name: "Assigned Rituals", icon: <Flame size={20} />, path: "/temple-admin/rituals" },
    { name: "Devotees List", icon: <Users size={20} />, path: "/temple-admin/devotees" },
    { name: "Profile Settings", icon: <Settings size={20} />, path: "/temple-admin/profile" },
  ];

  const activeClass = "bg-orange-500 text-white shadow-md";
  const inactiveClass = "text-gray-400 hover:bg-white/10 hover:text-white";

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? "w-64" : "w-20"} bg-[#1a1a2e] transition-all duration-300 flex flex-col z-50`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          {isSidebarOpen && <span className="text-white font-bold text-lg tracking-tight">Temple Admin</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center p-3 rounded-xl transition-all ${
                location.pathname === item.path ? activeClass : inactiveClass
              }`}
            >
              <span className="min-w-[30px]">{item.icon}</span>
              {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center w-full p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between shadow-sm">
          <h2 className="font-bold text-gray-700">
            {menuItems.find(i => i.path === location.pathname)?.name || "Dashboard"}
          </h2>
          <div className="flex items-center gap-4">
             <Bell className="text-gray-400 cursor-pointer" size={20} />
             <div className="h-8 w-[1px] bg-gray-200 mx-2" />
             <div className="flex items-center gap-2">
                <div className="text-right">
                   <p className="text-xs font-bold text-gray-800">{user?.first_name || "Admin"}</p>
                   <p className="text-[10px] text-orange-500 font-bold uppercase">Type: 2</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs border border-orange-200">
                   {user?.first_name?.charAt(0) || "A"}
                </div>
             </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}