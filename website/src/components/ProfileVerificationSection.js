import React, { useState, useEffect } from "react";
import { FaClock, FaExclamationCircle, FaShieldAlt, FaIdCard, FaTimes, FaCheck, FaGem } from "react-icons/fa";
import VerifiedBadge from "./VerifiedBadge";
import { getVerificationStatus, applyVerification, cancelVerification } from "../api/userApi";
import { getBluetickPlans, createPaymentOrder, verifyPayment } from "../api/subscriptionApi";

const ProfileVerificationSection = ({ userProfile }) => {
  const [verifStatus, setVerifStatus] = useState(userProfile?.verification || { status: "NOT_VERIFIED", isVerified: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Bluetick Plans state
  const [bluetickPlans, setBluetickPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: userProfile?.name || "",
    username: userProfile?.username || "",
    governmentIdType: "Aadhar",
    governmentIdNumber: "",
    website: "",
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    reason: "",
    confirmation: false,
  });

  // Files
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  useEffect(() => {
    fetchStatus();
    fetchPlans();

    // Load Razorpay Checkout script dynamically
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await getVerificationStatus();
      if (res && res.success) {
        setVerifStatus(res.verification || { status: "NOT_VERIFIED", isVerified: false });
      }
    } catch (err) {
      console.error("Fetch verification status error:", err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await getBluetickPlans();
      if (res && res.success) {
        const fetched = res.plans || [];
        setBluetickPlans(fetched);
        if (fetched.length > 0) {
          setSelectedPlanId(fetched[0]._id);
        }
      }
    } catch (err) {
      console.error("Fetch bluetick plans error:", err);
      setBluetickPlans([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenApplyModalWithPlan = (planId) => {
    if (planId) setSelectedPlanId(planId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    if (!formData.fullName.trim()) {
      setFeedback({ type: "error", message: "Full Name is required." });
      return;
    }
    if (!idFrontFile) {
      setFeedback({ type: "error", message: "Front ID Image is required." });
      return;
    }
    if (!selfieFile) {
      setFeedback({ type: "error", message: "Selfie Photo is required." });
      return;
    }
    if (!formData.confirmation) {
      setFeedback({ type: "error", message: "Please confirm that the submitted documents are genuine." });
      return;
    }

    const selectedPlan = bluetickPlans.find((p) => p._id === selectedPlanId);

    // Helper to submit verification request with optional payment details
    const submitVerificationRequest = async (paymentDetails = {}) => {
      try {
        const body = new FormData();
        body.append("fullName", formData.fullName.trim());
        body.append("username", formData.username.trim());
        body.append("governmentIdType", formData.governmentIdType);
        body.append("governmentIdNumber", formData.governmentIdNumber.trim());
        body.append("website", formData.website.trim());
        body.append("instagram", formData.instagram.trim());
        body.append("facebook", formData.facebook.trim());
        body.append("youtube", formData.youtube.trim());
        body.append("twitter", formData.twitter.trim());
        body.append("linkedin", formData.linkedin.trim());
        body.append("reason", formData.reason.trim());
        body.append("confirmation", "true");

        if (selectedPlanId) {
          body.append("planId", selectedPlanId);
        }

        if (paymentDetails.paymentId) {
          body.append("paymentId", paymentDetails.paymentId);
        }
        if (paymentDetails.orderId) {
          body.append("orderId", paymentDetails.orderId);
        }

        body.append("idFront", idFrontFile);
        if (idBackFile) body.append("idBack", idBackFile);
        body.append("selfie", selfieFile);

        const res = await applyVerification(body);
        if (res && res.success) {
          setFeedback({ type: "success", message: "Verification request submitted successfully!" });
          setIsModalOpen(false);
          fetchStatus();
        } else {
          setFeedback({ type: "error", message: res.message || "Failed to submit verification request." });
        }
      } catch (err) {
        console.error("Submit verification error:", err);
        const msg = err.response?.data?.message || "Failed to submit verification request.";
        setFeedback({ type: "error", message: msg });
      } finally {
        setIsSubmitting(false);
      }
    };

    setIsSubmitting(true);

    // Check if selected plan requires payment (> 0 rupees)
    if (selectedPlan && selectedPlan.price > 0) {
      if (!window.Razorpay) {
        setFeedback({ type: "error", message: "Payment SDK failed to load. Please check your internet connection." });
        setIsSubmitting(false);
        return;
      }

      try {
        const orderRes = await createPaymentOrder({ planId: selectedPlanId });
        if (!orderRes || !orderRes.success) {
          setFeedback({ type: "error", message: orderRes?.message || "Failed to initialize payment order." });
          setIsSubmitting(false);
          return;
        }

        const options = {
          key: orderRes.key,
          amount: orderRes.order.amount,
          currency: "INR",
          name: "CatchWatch Verification",
          description: `Blue Tick Badge - ${selectedPlan.name}`,
          order_id: orderRes.order.id,
          handler: async function (response) {
            try {
              const verifyRes = await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: selectedPlanId,
              });

              if (verifyRes && verifyRes.success) {
                // Payment verified, now submit verification request
                await submitVerificationRequest({
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                });
              } else {
                setFeedback({ type: "error", message: verifyRes?.message || "Payment verification failed." });
                setIsSubmitting(false);
              }
            } catch (err) {
              console.error("Verification payment error:", err);
              setFeedback({ type: "error", message: "Payment verification failed. Please contact support." });
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setFeedback({ type: "error", message: "Payment was cancelled." });
            },
          },
          prefill: {
            name: formData.fullName || userProfile?.name || "User",
            contact: userProfile?.phone || "9999999999",
          },
          theme: {
            color: "#F97316",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error("Create verification order error:", err);
        setFeedback({ type: "error", message: err.response?.data?.message || "Failed to initialize payment." });
        setIsSubmitting(false);
      }
    } else {
      // Free plan or no plan required
      await submitVerificationRequest();
    }
  };

  const handleCancelRequest = async () => {
    if (!window.confirm("Are you sure you want to cancel your pending verification request?")) return;
    try {
      const res = await cancelVerification();
      if (res && res.success) {
        fetchStatus();
      }
    } catch (err) {
      alert("Failed to cancel verification request.");
    }
  };

  const status = verifStatus.status || "NOT_VERIFIED";

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FaShieldAlt className="text-brand-orange text-2xl" />
            <span>Profile Verification</span>
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Get verified to build authenticity and unlock exclusive creator benefits.
          </p>
        </div>

        {/* Current Status Display Badge */}
        <div className="flex items-center gap-3">
          {status === "VERIFIED" && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-sm font-extrabold">
              <VerifiedBadge isVerified={true} size="lg" />
              <span>✔ Verified Account</span>
            </div>
          )}

          {status === "PENDING" && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-600 border border-amber-200 px-4 py-2 rounded-xl text-sm font-extrabold">
              <FaClock />
              <span>Verification Under Review</span>
            </div>
          )}

          {status === "REJECTED" && (
            <div className="flex flex-col sm:items-end gap-1">
              <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-xl text-xs font-extrabold">
                <FaExclamationCircle />
                <span>Verification Rejected</span>
              </div>
              {verifStatus.rejectionReason && (
                <span className="text-[11px] text-red-500 font-bold">Reason: {verifStatus.rejectionReason}</span>
              )}
            </div>
          )}

          {status === "SUSPENDED" && (
            <div className="flex flex-col sm:items-end gap-1">
              <div className="flex items-center gap-2 bg-purple-50 text-purple-600 border border-purple-200 px-4 py-1.5 rounded-xl text-xs font-extrabold">
                <FaExclamationCircle />
                <span>Verification Suspended</span>
              </div>
              {verifStatus.suspensionReason && (
                <span className="text-[11px] text-purple-500 font-bold">Reason: {verifStatus.suspensionReason}</span>
              )}
            </div>
          )}

          {/* Action Button */}
          {status === "NOT_VERIFIED" || status === "REJECTED" ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-sm"
            >
              Apply for Verification
            </button>
          ) : status === "PENDING" ? (
            <button
              onClick={handleCancelRequest}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition"
            >
              Cancel Request
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Bluetick Verification Plans Section ── */}
      {bluetickPlans.length > 0 && (
        <div className="mt-6 pt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <FaGem className="text-blue-500" />
              <span>Blue Tick & Creator Verification Tiers</span>
            </h3>
            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-full">
              Official Blue Badge
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {bluetickPlans.map((plan) => (
              <div
                key={plan._id}
                className={`relative bg-gradient-to-b from-blue-50/40 to-white border-2 rounded-2xl p-5 flex flex-col justify-between transition hover:shadow-md ${
                  plan.isRecommended
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {plan.isRecommended && (
                  <span className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                    Recommended
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-gray-900">{plan.name}</h4>
                    <VerifiedBadge isVerified={true} size="md" />
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-blue-600">₹{plan.price}</span>
                    <span className="text-xs font-bold text-gray-500">/ {plan.duration} days</span>
                  </div>

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-bold text-gray-700">
                          <FaCheck className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(status === "NOT_VERIFIED" || status === "REJECTED") && (
                  <button
                    onClick={() => handleOpenApplyModalWithPlan(plan._id)}
                    className="w-full mt-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-sm"
                  >
                    Select & Apply
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Benefits Grid */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4">
          Verification Benefits
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm mb-2">
              ✔
            </div>
            <h4 className="text-sm font-extrabold text-gray-900">Official Verified Badge</h4>
            <p className="text-xs text-gray-500 font-medium mt-1">Blue Tick displayed everywhere across CatchWatch.</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-sm mb-2">
              ⚡
            </div>
            <h4 className="text-sm font-extrabold text-gray-900">Better Search Ranking</h4>
            <p className="text-xs text-gray-500 font-medium mt-1">Verified creators appear higher in search results.</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm mb-2">
              🌟
            </div>
            <h4 className="text-sm font-extrabold text-gray-900">Creator Priority</h4>
            <p className="text-xs text-gray-500 font-medium mt-1">Receive enhanced visibility across feeds and recommendations.</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm mb-2">
              💬
            </div>
            <h4 className="text-sm font-extrabold text-gray-900">Highlighted Comments</h4>
            <p className="text-xs text-gray-500 font-medium mt-1">Your comments are highlighted and pinned higher.</p>
          </div>
        </div>
      </div>

      {/* ── Apply Verification Modal Form ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <FaIdCard className="text-brand-orange" />
                  <span>Apply for Profile Verification</span>
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Select a verification tier and submit genuine documents to request your official blue tick.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                <FaTimes />
              </button>
            </div>

            {feedback.message && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold mb-5 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {/* Plan Selection in Modal */}
              {bluetickPlans.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Select Verification Plan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {bluetickPlans.map((plan) => (
                      <div
                        key={plan._id}
                        onClick={() => setSelectedPlanId(plan._id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                          selectedPlanId === plan._id
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-gray-900">{plan.name}</span>
                          <VerifiedBadge isVerified={true} size="sm" />
                        </div>
                        <div className="text-lg font-black text-blue-600">₹{plan.price}</div>
                        <div className="text-[11px] font-bold text-gray-400">{plan.duration} days validity</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="Enter your official full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="@username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* ID Type & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Government ID Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="governmentIdType"
                    value={formData.governmentIdType}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-orange bg-white"
                  >
                    <option value="Aadhar">Aadhar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="PAN">PAN Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Government ID Number (Optional)</label>
                  <input
                    type="text"
                    name="governmentIdNumber"
                    placeholder="Enter ID document number"
                    value={formData.governmentIdNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Document Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Front ID Image <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-orange-50/30 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => handleFileChange(e, setIdFrontFile, setIdFrontPreview)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {idFrontPreview ? (
                      <img src={idFrontPreview} alt="Front ID" className="h-20 w-full object-cover rounded-lg" />
                    ) : (
                      <div className="py-2 text-xs font-bold text-gray-400">Upload Front Image</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Back ID Image (Optional)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-orange-50/30 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setIdBackFile, setIdBackPreview)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {idBackPreview ? (
                      <img src={idBackPreview} alt="Back ID" className="h-20 w-full object-cover rounded-lg" />
                    ) : (
                      <div className="py-2 text-xs font-bold text-gray-400">Upload Back Image</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Selfie Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-orange-50/30 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {selfiePreview ? (
                      <img src={selfiePreview} alt="Selfie" className="h-20 w-full object-cover rounded-lg" />
                    ) : (
                      <div className="py-2 text-xs font-bold text-gray-400">Upload Selfie</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Links (Optional) */}
              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                  Social Links & Media Presence (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    name="website"
                    placeholder="Website URL"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="text"
                    name="instagram"
                    placeholder="Instagram handle/link"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="text"
                    name="facebook"
                    placeholder="Facebook profile/page"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="text"
                    name="youtube"
                    placeholder="YouTube Channel link"
                    value={formData.youtube}
                    onChange={handleInputChange}
                    className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="text"
                    name="twitter"
                    placeholder="X / Twitter handle"
                    value={formData.twitter}
                    onChange={handleInputChange}
                    className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="text"
                    name="linkedin"
                    placeholder="LinkedIn Profile link"
                    value={formData.linkedin}
                    onChange={handleInputChange}
                    className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Verification</label>
                <textarea
                  name="reason"
                  rows="2"
                  placeholder="Explain why your account should be verified..."
                  value={formData.reason}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Checkbox confirmation */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="confirmation"
                  name="confirmation"
                  checked={formData.confirmation}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-brand-orange rounded border-gray-300 focus:ring-brand-orange"
                />
                <label htmlFor="confirmation" className="text-xs font-bold text-gray-700 cursor-pointer">
                  I confirm that the submitted documents are genuine.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting Request..." : "Submit & Apply Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileVerificationSection;
