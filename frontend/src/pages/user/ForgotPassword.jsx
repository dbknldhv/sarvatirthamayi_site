import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiArrowLeft, FiArrowRight, FiCheckCircle, FiShield } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import api from "../../api/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter Email, 2: OTP & New Password
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: "", // Changed from mobile_number
    otp: "",
    new_password: "",
    confirm_password: ""
  });

  // Step 1: Send OTP to Email via Nodemailer
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/forgot-password", {
        email: formData.email
      });
      if (data.success) {
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Email not found or error sending OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify & Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      return setError("Passwords do not match!");
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/reset-password", {
        email: formData.email,
        otp: formData.otp,
        new_password: formData.new_password
      });

      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP or reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaff] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-purple-100/50 p-8 sm:p-10 border border-purple-50"
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-6">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle size={45} />
              </div>
              <h2 className="text-3xl font-serif text-slate-900 mb-2">Password Reset!</h2>
              <p className="text-slate-500 mb-6">Your security is updated. Redirecting to login...</p>
              <Loader2 className="animate-spin text-purple-600 mx-auto" />
            </motion.div>
          ) : (
            <div key="form">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FiShield size={32} />
                </div>
                <h2 className="text-3xl font-serif text-slate-900 mb-2">
                  {step === 1 ? "Reset Password" : "Check Your Mail"}
                </h2>
                <p className="text-slate-500 text-sm">
                  {step === 1 
                    ? "Enter your registered email to receive a reset code." 
                    : `We've sent a 6-digit code to ${formData.email}`}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-500 rounded-full" /> {error}
                </div>
              )}

              <form onSubmit={step === 1 ? handleRequestOtp : handleResetPassword} className="space-y-5">
                {step === 1 ? (
                  <div className="relative group">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600" />
                    <input
                      type="email"
                      placeholder="Registered Email Address"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-purple-500 outline-none transition-all font-medium"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="000000"
                      maxLength="6"
                      className="w-full text-center text-3xl tracking-[0.5rem] font-bold py-4 bg-purple-50 border-2 border-dashed border-purple-200 rounded-2xl outline-none focus:border-purple-500"
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                      required
                    />
                    <div className="relative group">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        placeholder="New Password"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-purple-500 outline-none font-medium"
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                      />
                    </div>
                    <div className="relative group">
                      <FiCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-purple-500 outline-none font-medium"
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <span>{step === 1 ? "Get Reset Code" : "Update Password"}</span>
                      <FiArrowRight />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-purple-600 flex items-center justify-center gap-2 transition-colors">
                  <FiArrowLeft /> Back to Login
                </Link>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}