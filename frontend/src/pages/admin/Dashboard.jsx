import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Home, Users, ChevronDown, Building, Menu, ScrollText,
  Calendar, CreditCard, BookOpen, Gift, Settings, User, LogOut, Ticket
} from "lucide-react";

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-4 z-50">
        <span className="font-bold text-indigo-400 tracking-tighter italic">SARVATIRTHAMAYI</span>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen sticky top-0 ${collapsed ? "w-20" : "w-64"}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed && <span className="font-black text-indigo-400 tracking-widest text-xs">ADMIN PANEL</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400">
            <Menu size={20} />
          </button>
        </div>
        <SidebarContent collapsed={collapsed} onLogout={handleLogout} />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="w-64 bg-slate-900 text-white animate-in slide-in-from-left duration-300 relative z-50">
            <SidebarContent collapsed={false} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-50 overflow-y-auto">
        <div className="p-4 md:p-10 mt-14 md:mt-0 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ collapsed, onLogout }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
      <SidebarLink collapsed={collapsed} to="/admin/dashboard" icon={<Home size={18} />}>Dashboard</SidebarLink>
      <SidebarLink collapsed={collapsed} to="/admin/user/list" icon={<Users size={18} />}>Devotees</SidebarLink>

      <Dropdown collapsed={collapsed} title="Temple" icon={<Building size={18} />} 
        items={[{ label: "Temple List", to: "/admin/temple" }, { label: "Visits/Bookings", to: "/admin/temple-booking" }]} 
      />

      <Dropdown collapsed={collapsed} title="Ritual" icon={<ScrollText size={18} />} 
        items={[
          { label: "Ritual List", to: "/admin/ritual" },
          { label: "Packages", to: "/admin/ritual/package" },
          { label: "Bookings", to: "/admin/ritual-booking" }
        ]} 
      />

      <Dropdown collapsed={collapsed} title="Membership" icon={<CreditCard size={18} />} 
        items={[{ label: "Plan List", to: "/admin/membership-card" }, { label: "Subscriptions", to: "/admin/purchased-member-card" }]} 
      />

      <SidebarLink collapsed={collapsed} to="/admin/voucher" icon={<Ticket size={18} />}>Vouchers</SidebarLink>
      <SidebarLink collapsed={collapsed} to="/admin/event" icon={<Calendar size={18} />}>Events</SidebarLink>
      <SidebarLink collapsed={collapsed} to="/admin/profile" icon={<User size={18} />}>My Profile</SidebarLink>

      <div className="pt-4 mt-4 border-t border-slate-800">
        <button onClick={onLogout} className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all ${collapsed ? "justify-center" : ""}`}>
          <LogOut size={18} />
          {!collapsed && <span className="font-bold uppercase tracking-widest text-[10px]">Logout</span>}
        </button>
      </div>
    </nav>
  );
}

function SidebarLink({ to, icon, children, collapsed }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}>
      {icon} {!collapsed && <span>{children}</span>}
    </NavLink>
  );
}

function Dropdown({ title, icon, items, collapsed }) {
  const [open, setOpen] = useState(false);
  if (collapsed) return <div className="flex justify-center py-3 text-slate-400 hover:text-white cursor-pointer">{icon}</div>;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${open ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
        <div className="flex items-center gap-3">{icon}<span className="text-sm font-bold">{title}</span></div>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-800 pl-2">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `block px-4 py-2 text-[11px] font-bold uppercase tracking-tighter rounded-lg ${isActive ? "text-indigo-400" : "text-slate-500 hover:text-white"}`}>{item.label}</NavLink>
        ))}
      </div>}
    </div>
  );
}