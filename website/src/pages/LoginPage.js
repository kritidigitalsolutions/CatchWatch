import React, { useState, useEffect } from 'react';
import { FaPhoneAlt, FaUnlockAlt, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom'; // Redirection ke liye
import { toast } from 'react-toastify';
// Apni api file ka correct path yahan dalein
import { auth, verifyOTP } from '../api/authApi';

const LoginPage = () => {
    // Step 1: Phone Number, Step 2: OTP Verification
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleResendOtp = async () => {
        if (timer > 0 || isLoading) return;
        setIsLoading(true);
        setOtp('');
        try {
            const response = await auth({ phone: phoneNumber });
            if (response && response.success) {
                setTimer(60);
                toast.success("OTP resent successfully!");
            } else {
                toast.error(response.message || "Failed to resend OTP. Please try again.");
            }
        } catch (error) {
            console.error("OTP Resend Error:", error);
            toast.error("Something went wrong while resending OTP.");
        } finally {
            setIsLoading(false);
        }
    };
    // Handle sending OTP

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (phoneNumber.length < 10) {
            toast.warning("Please enter a valid 10-digit phone number.");
            return;
        }

        setIsLoading(true);

        try {
            // API call to send OTP. Backend me 'phone' key bhejna confirm kar lein.
            const response = await auth({ phone: phoneNumber });

            // Agar API success true return karti hai, toh Step 2 par jayein
            if (response && response.success) {
                setStep(2);
                setTimer(60);
                toast.success("OTP sent successfully!");
            } else {
                toast.error(response.message || "Failed to send OTP. Please try again.");
            }
        } catch (error) {
            console.error("OTP Send Error:", error);
            toast.error("Something went wrong while sending OTP.");
        } finally {
            setIsLoading(false);
        }
    };
    // Handle OTP Verification

    // useNavigate hook ko component ke top par define karna zaroori hai
    // const navigate = useNavigate(); (Isko component k andar add karein)

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 4) {
            toast.warning("Please enter a valid OTP.");
            return;
        }

        setIsLoading(true);

        try {
            // API call to verify OTP
            const response = await verifyOTP({ phone: phoneNumber, otp: otp });

            // Backend ke response ke according condition check karein (jaise token milna)
            if (response && response.token) {
                // Token ko localStorage me save kar lein
                localStorage.setItem("authToken", response.token);

                toast.success("Login successful!");
                // User ko uske dashboard ya home page par redirect karein
                navigate("/");
            } else {
                toast.error(response.message || "Invalid OTP entered.");
            }
        } catch (error) {
            console.error("OTP Verify Error:", error);
            toast.error("OTP verification failed. Please check the code and try again.");
        } finally {
            setIsLoading(false);
        }
    };
    // Go back to edit phone number
    const handleEditNumber = () => {
        setStep(1);
        setOtp('');
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">

            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-orange/20 rounded-full blur-[100px] pointer-events-none transition-all duration-1000"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none transition-all duration-1000"></div>

            {/* Main Card */}
            <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-500">

                <div className="p-8 sm:p-10 space-y-8">

                    {/* Header */}
                    <div className="text-center space-y-2 relative">
                        {step === 2 && (
                            <button
                                onClick={handleEditNumber}
                                className="absolute left-0 top-1 text-gray-400 hover:text-white transition-colors"
                                title="Edit Phone Number"
                            >
                                <FaArrowLeft />
                            </button>
                        )}
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            {step === 1 ? 'Welcome' : 'Verify OTP'}
                        </h1>
                        <p className="text-sm text-gray-400 font-medium">
                            {step === 1
                                ? 'Enter your phone number to continue.'
                                : <span>Code sent to <b className="text-white">+91 {phoneNumber}</b></span>}
                        </p>
                    </div>

                    {/* Form Step 1: Phone Number */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-6 animate-fade-in">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider pl-1">
                                    Mobile Number
                                </label>
                                <div className="relative group flex items-center">
                                    {/* Country Code Box */}
                                    <div className="bg-black/60 border border-white/10 border-r-0 rounded-l-xl py-3.5 px-4 text-gray-400 font-bold flex items-center gap-2">
                                        <FaPhoneAlt className="text-gray-500 group-focus-within:text-brand-orange transition-colors text-sm" />
                                        <span>+91</span>
                                    </div>
                                    {/* Phone Input */}
                                    <input
                                        type="tel"
                                        maxLength="10"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                        required
                                        placeholder="Enter 10 digit number"
                                        className="w-full bg-black/40 border border-white/10 rounded-r-xl py-3.5 pl-3 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium tracking-wide"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || phoneNumber.length < 10}
                                className="w-full bg-brand-orange hover:bg-orange-600 disabled:bg-orange-500 disabled:text-white disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-brand-orange/30 flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    "Get OTP"
                                )}
                            </button>
                        </form>
                    )}

                    {/* Form Step 2: OTP Verification */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider pl-1">
                                    Enter 6-Digit OTP
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-orange transition-colors">
                                        <FaUnlockAlt />
                                    </div>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        required
                                        placeholder="••••••"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-center text-xl tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-black"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.length < 4}
                                className="w-full bg-brand-orange hover:bg-orange-600 disabled:bg-orange-500 disabled:text-white disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-brand-orange/30 flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    "Verify & Proceed"
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={timer > 0 || isLoading}
                                    className="text-xs font-bold text-gray-400 hover:text-brand-orange disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    {timer > 0 ? `Resend OTP in ${timer}s` : "Didn't receive the code? Resend"}
                                </button>
                            </div>
                        </form>
                    )}

                </div>

                {/* Footer */}
                <div className="bg-black/50 py-4 text-center border-t border-white/5 px-6">
                    <p className="text-[11px] text-gray-500 font-medium">
                        By continuing, you agree to our <a href="/" className="hover:text-brand-orange transition">Terms of Service</a> and <a href="/" className="hover:text-brand-orange transition">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;