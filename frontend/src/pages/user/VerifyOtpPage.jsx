import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  
  const navigate = useNavigate();
  const location = useLocation();
  const emailOrMobile = location.state?.identifier || "your registered device";

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Handle Input Change
  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false; // Basic Validation: Only numbers

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value !== "") {
      element.nextSibling.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");

    // Basic Length Validation
    if (otpCode.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Mock API Call - Replace with your authService.verifyOtp(otpCode)
      console.log("Verifying OTP:", otpCode);
      
      // On Success:
      // navigate("/login"); 
    } catch (err) {
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify OTP</h2>
          <p className="text-gray-500 text-sm mt-2">
            We sent a code to <span className="font-semibold text-gray-700">{emailOrMobile}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onFocus={(e) => e.target.select()}
                className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-gray-50"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Verify & Proceed"}
          </button>
        </form>

        <div className="text-center mt-8 text-sm">
          <p className="text-gray-500">
            Didn't receive the code?{" "}
            {timer > 0 ? (
              <span className="text-indigo-600 font-semibold">Resend in {timer}s</span>
            ) : (
              <button 
                onClick={() => setTimer(30)} 
                className="text-indigo-600 font-bold hover:underline"
              >
                Resend Now
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}