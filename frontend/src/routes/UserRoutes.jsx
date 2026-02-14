import React from "react";
import { Route, Navigate } from "react-router-dom";
import About from "../pages/About";

// Import User Components
import LandingPage from "../pages/LandingPage";
import UserLogin from "../pages/user/UserLogin";
import UserSignup from "../pages/user/UserSignup";
import VerifyOtpPage from "../pages/user/VerifyOtpPage";
import UserForgotPassword from "../pages/user/ForgotPassword";
import UserProfile from "../pages/user/Profile";
import JoinNow from '../pages/user/STMCLub/JoinNow';
import JoinClub from '../pages/user/STMCLub/JoinClub';

import TemplesIndex from '../pages/user/Temples/index';
import AssistanceIndex from '../pages/user/TempleAssistance/index';

import RitualPage from '../pages/user/Rituals/ritualpage';
import RitualBookingForm from '../pages/user/Rituals/RitualBookingForm';
import RitualView from '../pages/user/Rituals/ritualview';
import BookingSuccessPage from "../pages/user/Rituals/BookingSuccessPage";

import ProtectedRoute from "../components/ProtectedRoute";
// NEW: Import the Booking Form Component
import BookingForm from "../pages/user/TempleAssistance/BookingForm";
import MembershipSuccess from "../pages/user/STMClub/MembershipSuccess"; // Import the success component

export const UserRoutes = [
    /* Public User Routes */
    <Route key="landing" path="/" element={<LandingPage />} />,
    <Route key="about" path="/about" element={<About />} />,
    <Route key="login" path="/user/login" element={<UserLogin />} />,
    <Route key="signup" path="/signup" element={<UserSignup />} />,
    <Route key="verify-otp" path="/verify-otp" element={<VerifyOtpPage />} />,
    <Route key="forgot-pass" path="/forgot-password" element={<UserForgotPassword />} />,
    
    /* User Features */
    <Route key="stm-club" path="/user/stm-club" element={<JoinNow />} />,
    <Route key="temples" path="/user/temples" element={<TemplesIndex />} />,
    <Route key="assistance" path="/user/temple-assistance" element={<AssistanceIndex />} />,
    
    <Route key="rituals-list" path="/user/rituals" element={<RitualPage />} />,
    <Route key="ritual-view" path="/ritual-view/:id" element={<RitualView />} />,
    
    <Route key="join-now" path="/join-now" element={<JoinNow />} />,
  
    /* Protected User Routes (Type 3) */
    <Route key="profile" path="/profile" element={
      <ProtectedRoute allowedTypes={[3]}>
        <UserProfile />
      </ProtectedRoute>
    } />,
    <Route key="book-temple" path="/book-temple/:id" element={
      <ProtectedRoute allowedTypes={[3]}>
        <BookingForm />
      </ProtectedRoute>
    } />,
    <Route key="book-ritual" path="/book-ritual/:id" element={
  <ProtectedRoute allowedTypes={[3]}>
    <RitualBookingForm />
  </ProtectedRoute>
} />,
  <Route key="booking-success" path="/booking-success" element={
  <ProtectedRoute allowedTypes={[3]}>
    <BookingSuccessPage />
  </ProtectedRoute>
} />,

    <Route key="membership-success" path="/membership-card" element={
      <ProtectedRoute allowedTypes={[3]}>
        <MembershipSuccess />
      </ProtectedRoute>
    } />,
    <Route key="join-club" path="/join-club/:id" element={
      <ProtectedRoute allowedTypes={[3]}>
        <JoinClub />
      </ProtectedRoute>
    } />,
    
    <Route key="account-redirect" path="/my-account" element={<Navigate to="/profile" replace />} />

    
];