import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getSubscriptionStatus,
  createPaymentOrder,
  verifyPayment
} from '../api/subscriptionApi';
import { getUserProfile } from '../api/userApi';
import Loader from '../components/Loader';
import { MdWorkspacePremium } from "react-icons/md";

const ChoosePlanPage = () => {
  const navigate = useNavigate();

  // Hardcoded Catalog Plans with exact database IDs
  const catalogPlans = [
    { _id: '6a3e127bf47c99538125f72f', name: 'Test Plan', price: 1, duration: 30, features: ['All content access', 'Ad-free Streaming', 'SD Quality playback'] },
    { _id: '6a27a77f109c430c6f896316', name: 'Monthly Plan', price: 149, duration: 30, features: ['Unlimited Movies', 'Full Access', 'HD Quality playback'] },
    { _id: '6a27ade7109c430c6f89631b', name: 'Yearly Plan', price: 1499, duration: 365, features: ['HD Unlimited', 'Ad-free Streaming', '4K Quality playback'] }
  ];

  // Dynamic States
  const [activePlanId, setActivePlanId] = useState('6a3e127bf47c99538125f72f');
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [remainingDays, setRemainingDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch subscription status
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const statusRes = await getSubscriptionStatus();
      if (statusRes && statusRes.success && statusRes.subscription) {
        setActiveSubscription(statusRes.subscription);
        setRemainingDays(statusRes.remainingDays || 0);
      } else {
        setActiveSubscription(null);
      }
    } catch (err) {
      // 403 No active subscription is expected for free users
      setActiveSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Razorpay Payment and Subscription Activation
  const handleSubscribe = async () => {
    if (!activePlanId) return;
    
    const selectedPlan = catalogPlans.find(p => p._id === activePlanId);
    if (!selectedPlan) return;

    if (!window.Razorpay) {
      alert("Payment SDK failed to load. Please check your internet connection.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create Order on Backend (Retrieves Key ID and Order details securely)
      const orderRes = await createPaymentOrder({ planId: activePlanId });
      
      if (!orderRes || !orderRes.success) {
        alert(orderRes?.message || "Failed to create order.");
        setSubmitting(false);
        return;
      }

      // 2. Open Razorpay Panel with dynamic Key & Order details returned from backend
      const options = {
        key: orderRes.key, // Dynamic test key retrieved from backend .env
        amount: orderRes.order.amount,
        currency: "INR",
        name: "CatchWatch Premium",
        description: `Purchase of ${selectedPlan.name}`,
        order_id: orderRes.order.id, // Order ID from backend
        handler: async function (response) {
          try {
            // Verify payment and activate subscription on DB
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: activePlanId
            });

            if (verifyRes && verifyRes.success) {
              alert("Payment successful! Premium plan activated.");
              localStorage.setItem("userIsPremium", "true");
              // Sync user profile cache
              try { await getUserProfile(); } catch (e) {}
              fetchData(); // Refresh page status
            } else {
              alert(verifyRes.message || "Failed to verify subscription.");
            }
          } catch (err) {
            console.error("Subscription registration error:", err);
            alert("Payment succeeded, but verification failed. Please contact support.");
          }
        },
        prefill: {
          name: "Premium User",
          email: "premium@catchwatch.com",
          contact: "9999999999"
        },
        theme: {
          color: "#F97316" // brand orange
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Create Order Error:", err);
      alert(err.response?.data?.message || "Failed to initialize payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <Loader />;

  const activePlan = catalogPlans.find(p => p._id === activePlanId);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 py-6 px-4">
      
      {/* Active Subscription Banner */}
      {activeSubscription ? (
        <div className="bg-neutral-900 border border-brand-orange/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white space-y-6">
          <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-brand-orange/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl text-brand-orange bg-brand-orange/10 p-3 rounded-2xl border border-brand-orange/20">
                <MdWorkspacePremium />
              </span>
              <div>
                <span className="text-[10px] text-brand-orange uppercase font-black tracking-widest bg-brand-orange/15 px-2.5 py-0.5 rounded border border-brand-orange/25">Active Member</span>
                <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
                  {activeSubscription.plan?.name || "Premium Plan"}
                </h2>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl py-2.5 px-5 text-center">
              <span className="text-xs text-gray-400 font-bold block">VALIDITY DETAILS</span>
              <span className="text-xl font-black text-brand-orange">{remainingDays} Days Remaining</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-gray-400 font-bold text-xs">AMOUNT PAID</span>
              <p className="font-extrabold text-base text-gray-200">₹{activeSubscription.amount}</p>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 font-bold text-xs">START DATE</span>
              <p className="font-extrabold text-base text-gray-200">
                {new Date(activeSubscription.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 font-bold text-xs">RENEWAL / EXPIRY DATE</span>
              <p className="font-extrabold text-base text-gray-200">
                {new Date(activeSubscription.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/')}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-2xl transition"
            >
              Start Streaming
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="text-center md:text-left border-b border-gray-200 pb-4">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-800 flex items-center justify-center md:justify-start gap-2">
              Upgrade to Premium
            </h1>
            <p className="text-xs sm:text-base text-gray-500 mt-1">Unlock ad-free Ultra HD video streaming and premium content instantly.</p>
          </div>

          {/* Grid Layout Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {catalogPlans.map((plan) => (
              <div
                key={plan._id}
                onClick={() => setActivePlanId(plan._id)}
                className={`bg-white border rounded-3xl p-6 cursor-pointer flex flex-col justify-between transform transition-all relative ${
                  activePlanId === plan._id 
                    ? 'border-brand-orange ring-4 ring-brand-orange/10 shadow-xl scale-[1.01]' 
                    : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.price === 1499 && (
                  <span className="absolute top-0 right-6 transform -translate-y-1/2 bg-brand-orange text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow">
                    Best Value
                  </span>
                )}
                
                <div>
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-800 tracking-tight">{plan.name}</h3>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                        Validity: {plan.duration} Days
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-brand-orange">₹{plan.price}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feat, index) => (
                      <div key={index} className="flex items-start gap-2.5 text-xs text-gray-600 font-semibold leading-relaxed">
                        <span className="text-green-500 font-bold text-sm">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div 
                  className={`w-full text-center font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition ${
                    activePlanId === plan._id 
                      ? 'bg-brand-orange text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {activePlanId === plan._id ? 'Selected' : 'Select Option'}
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Panel */}
          {activePlan && (
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-lg font-black text-gray-800">
                  Ready to upgrade to {activePlan.name}?
                </h3>
                <p className="text-sm text-gray-500 font-semibold">
                  Safe and secure checkout powered by Razorpay.
                </p>
              </div>
              
              <button
                onClick={handleSubscribe}
                disabled={submitting}
                className="bg-brand-orange hover:bg-brand-orange/90 disabled:bg-brand-orange/50 text-white font-black py-4 px-8 rounded-2xl text-sm tracking-wider uppercase transition shadow-md shadow-brand-orange/20"
              >
                {submitting ? "Loading Checkout..." : `Pay & Subscribe ₹${activePlan.price}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChoosePlanPage;