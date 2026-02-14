import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // 1. Import useAuth
import {
  Home,
  Users,
  ChevronDown,
  Building,
  Menu,
  ScrollText,
  Calendar,
  CreditCard,
  BookOpen,
  Gift,
  Settings,
  User,
  LogOut,
} from "lucide-react";

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth(); // 2. Get logout from Context
  const navigate = useNavigate();

  // --- 🔑 Logout Functionality ---
  const handleLogout = () => {
    logout(); // 3. Use the unified logout (clears token, user, and state)
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-4 z-50">
        <span className="font-semibold text-indigo-400">Admin</span>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen sticky top-0
        ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {!collapsed && <span className="font-semibold text-indigo-400 tracking-wider">ADMIN PANEL</span>}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
        </div>

        <SidebarContent collapsed={collapsed} onLogout={handleLogout} />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="w-64 bg-slate-900 text-white animate-in slide-in-from-left duration-300 relative z-50">
            <SidebarContent collapsed={false} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 bg-gray-50 overflow-y-auto">
        {/* Optional: Add a top header inside main if you want a breadcrumb or profile name */}
        <div className="p-4 md:p-8 mt-14 md:mt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* ---------------- Sidebar Content ---------------- */

function SidebarContent({ collapsed, onLogout }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
      <SidebarLink collapsed={collapsed} to="/admin/dashboard" icon={<Home size={18} />}>
        Dashboard
      </SidebarLink>

      <SidebarLink collapsed={collapsed} to="/admin/user/list" icon={<Users size={18} />}>
        Users
      </SidebarLink>

      <Dropdown
        collapsed={collapsed}
        title="Temple"
        icon={<Building size={18} />}
        items={[
          { label: "Temple List", to: "/admin/temple" },
          { label: "Bookings", to: "/admin/temple-booking" },
        ]}
      />

      <Dropdown
        collapsed={collapsed}
        title="Ritual"
        icon={<ScrollText size={18} />}
        items={[
          { label: "Ritual List", to: "/admin/ritual" },
          { label: "Ritual Types", to: "/admin/ritual/type" },
          { label: "Packages", to: "/admin/ritual/package" },
          { label: "Bookings", to: "/admin/ritual-booking" },
        ]}
      />

      <Dropdown
        collapsed={collapsed}
        title="Events"
        icon={<Calendar size={18} />}
        items={[
          { label: "Event List", to: "/admin/event" },
          { label: "Event Bookings", to: "/admin/event-booking" },
        ]}
      />

      <Dropdown
        collapsed={collapsed}
        title="Membership"
        icon={<CreditCard size={18} />}
        items={[
          { label: "Card List", to: "/admin/membership-card" },
          { label: "Purchased Cards", to: "/admin/purchased-member-card" },
        ]}
      />

      <SidebarLink
        collapsed={collapsed}
        to="/admin/ved_path_shala"
        icon={<BookOpen size={18} />}
      >
        Ved Path Shala
      </SidebarLink>

      <Dropdown
        collapsed={collapsed}
        title="Donation"
        icon={<Gift size={18} />}
        items={[
          { label: "Donation List", to: "/admin/donation" },
          { label: "User Documents", to: "/admin/user-donations" },
        ]}
      />

      <Dropdown
        collapsed={collapsed}
        title="Settings"
        icon={<Settings size={18} />}
        items={[
          { label: "Translation", to: "/admin/translation" },
          { label: "Menu Setup", to: "/admin/menu" },
        ]}
      />

      <SidebarLink
        collapsed={collapsed}
        to="/admin/profile"
        icon={<User size={18} />}
      >
        My Profile
      </SidebarLink>

      <div className="pt-4 mt-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-all group
          ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </nav>
  );
}

/* ---------------- Reusable Components ---------------- */

function SidebarLink({ to, icon, children, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
        ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      {icon}
      {!collapsed && <span>{children}</span>}
    </NavLink>
  );
}

function Dropdown({ title, icon, items, collapsed }) {
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <div className="group relative flex justify-center py-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer">
        {icon}
        {/* Tooltip for collapsed mode */}
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors group
        ${open ? "bg-slate-800/50 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? "rotate-180" : "text-slate-600"}`}
        />
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 animate-in fade-in duration-300">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block pl-8 pr-4 py-2 text-xs rounded-md transition-all
                ${
                  isActive
                    ? "text-indigo-400 font-bold"
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/30"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}