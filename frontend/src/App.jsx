import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from './components/Navbar';

// 👤 User Module Import (The "Baby Stage" isolation)
import { UserRoutes } from "./routes/UserRoutes";

// 🔐 Admin & Public Imports
import AdminLogin from "./pages/admin/AdminLogin";
import ForgotPassword from "./pages/admin/ForgotPassword";
import ResetPassword from "./pages/admin/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/admin/Dashboard";

/* Admin Pages - Users */
import UsersList from "./pages/admin/users/UsersList.jsx";
import ViewUser from "./pages/admin/users/ViewUser.jsx";
import EditUser from "./pages/admin/users/EditUser.jsx";

/* Admin Pages - Donation */
import DonationList from "./pages/admin/donation/DonationList.jsx";
import AddDonation from './pages/admin/donation/AddDonation.jsx';
import ViewDonation from "./pages/admin/donation/ViewDonation.jsx";
import EditDonation from "./pages/admin/donation/EditDonation.jsx";

/* Admin Pages - Temple */
import TempleList from "./pages/admin/temple/TempleList.jsx";
import AddTemple from "./pages/admin/temple/AddTemple.jsx";
import ViewTemple from "./pages/admin/temple/ViewTemple.jsx";
import EditTemple from "./pages/admin/temple/EditTemple.jsx";
import TempleBookings from "./pages/admin/temple/TempleBookings.jsx";
import TempleBookingsView from "./pages/admin/temple/TempleBookingsView.jsx";

/* Admin Rituals */
import RitualList from "./pages/admin/ritual/RitualList.jsx";
import RitualView from './pages/admin/ritual/RitualView.jsx';
import RitualEdit from './pages/admin/ritual/RitualEdit.jsx';
import AddRitual from "./pages/admin/ritual/AddRitual.jsx";
import RitualPackages from "./pages/admin/ritual/RitualPackages.jsx";
import RitualPackageAdd from "./pages/admin/ritual/ritualpackagelist/RitualPackageAdd";
import RitualPackageView from "./pages/admin/ritual/ritualpackagelist/RitualPackageView";
import RitualPackageEdit from "./pages/admin/ritual/ritualpackagelist/RitualPackageEdit";

/* Temple Admin */
import TempleAdminDashboard from "./pages/temple-admin/TempleAdminDashboard";

/* Ritual Bookings & Types */
import RitualBookings from "./pages/admin/ritual/RitualBookings.jsx";
import RitualBookingsView from "./pages/admin/ritual/RitualBookingsView.jsx";
import RitualTypes from "./pages/admin/ritual/RitualTypes.jsx";
import RitualTypesAdd from "./pages/admin/ritual/ritualtypeslist/RitualTypesAdd";
import RitualTypesEdit from "./pages/admin/ritual/ritualtypeslist/RitualTypesEdit";
import RitualTypesView from "./pages/admin/ritual/ritualtypeslist/RitualTypesView";

/* Membership Management */
import MembershipList from "./pages/admin/membership/MembershipList.jsx";
import MembershipAdd from "./pages/admin/membership/MembershipAdd.jsx";
import PurchasedCards from "./pages/admin/membership/PurchasedCards.jsx";
import ViewPurchasedCard from "./pages/admin/membership/ViewPurchasedCard.jsx";
import ViewMembership from "./pages/admin/membership/ViewMembership";
import EditMembershipPage from "./pages/admin/membership/EditMembershipPage";

/* Other Admin Pages */
import EventList from "./pages/admin/event/EventList.jsx";
import EventBookings from "./pages/admin/event/EventBookings.jsx";
import Profile from "./pages/admin/profile/Profile.jsx";
import Menu from "./pages/admin/settings/Menu.jsx";
import Translation from "./pages/admin/settings/Translation.jsx";
import VedPathShala from "./pages/ved-path-shala/VedaPathShala.jsx";

export default function App() {
  const location = useLocation();

  // 🛠️ UI/UX Logic: List of paths where Navbar should be HIDDEN
  const authPaths = ["/user/login", "/signup", "/verify-otp", "/forgot-password", "/admin/login"];
  const isAdminArea = location.pathname.startsWith("/admin") || location.pathname.startsWith("/temple-admin");
  
  // Decide if Navbar should be rendered
  const showNavbar = !authPaths.includes(location.pathname) && !isAdminArea;

  return (
    <>
      {/* Navbar only shows on public landing/user pages */}
      {showNavbar && <Navbar />}

      <Routes>
        {/* 👤 1. Isolated User Module Routes */}
        {UserRoutes}

        {/* 🔐 2. Admin Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/temple-admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password/:token" element={<ResetPassword />} />

        {/* 🛡️ 3. Admin Protected Layout (Type 1) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedTypes={[1]}>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h1 className="text-2xl font-bold text-slate-800">Admin Overview</h1>
              <p className="text-slate-500">Welcome back! Manage your system settings here.</p>
            </div>
          } />

          {/* Admin Sub-Routes */}
          <Route path="user/list" element={<UsersList />} />
          <Route path="user/view/:id" element={<ViewUser />} />
          <Route path="user/edit/:id" element={<EditUser />} />

          <Route path="donation" element={<DonationList />} />
          <Route path="donation/add" element={<AddDonation />} />
          <Route path="donation/view/:id" element={<ViewDonation />} />
          <Route path="donation/edit/:id" element={<EditDonation />} />

          <Route path="temple" element={<TempleList />} />
          <Route path="temple/add" element={<AddTemple />} />
          <Route path="temple/view/:id" element={<ViewTemple />} />
          <Route path="temple/edit/:id" element={<EditTemple />} />
          <Route path="temple-booking" element={<TempleBookings />} />
          <Route path="temple-booking/view/:id" element={<TempleBookingsView />} />

          <Route path="ritual" element={<RitualList />} />
          <Route path="ritual/add" element={<AddRitual />} />
          <Route path="ritual/view/:id" element={<RitualView />} />
          <Route path="ritual/edit/:id" element={<RitualEdit />} />
          <Route path="ritual/package" element={<RitualPackages />} />
          <Route path="ritual/package/add" element={<RitualPackageAdd />} />
          <Route path="ritual/package/view/:id" element={<RitualPackageView />} />
          <Route path="ritual/package/edit/:id" element={<RitualPackageEdit />} />
          <Route path="ritual-booking" element={<RitualBookings />} />
          <Route path="ritual-bookings/:id" element={<RitualBookingsView />} />

          <Route path="ritual/type" element={<RitualTypes />} />
          <Route path="ritual/type/add" element={<RitualTypesAdd />} />
          <Route path="ritual/type/view/:id" element={<RitualTypesView />} />
          <Route path="ritual/type/edit/:id" element={<RitualTypesEdit />} />

          <Route path="membership-card" element={<MembershipList />} />
          <Route path="purchased-member-card" element={<PurchasedCards />} />
          {/* ADD THIS LINE BELOW */}
<Route path="purchased-member-card/view/:id" element={<ViewPurchasedCard />} />
          <Route path="membership/add" element={<MembershipAdd />} />
          <Route path="membership/view/:id" element={<ViewMembership />} />
          <Route path="membership/edit/:id" element={<EditMembershipPage />} />

          <Route path="event" element={<EventList />} />
          <Route path="event-booking" element={<EventBookings />} />
          <Route path="ved_path_shala" element={<VedPathShala />} />
          <Route path="translation" element={<Translation />} />
          <Route path="menu" element={<Menu />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ⛩️ 4. Temple Admin Layout (Type 2) */}
        <Route
          path="/temple-admin"
          element={
            <ProtectedRoute allowedTypes={[2]}>
              <TempleAdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<div>Welcome to Temple Dashboard</div>} />
        </Route>

        {/* ❌ 5. Global Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}