import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMoneyBillWave, FaUndoAlt } from 'react-icons/fa';

const RefundPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-2 sm:px-0">
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
          <FaMoneyBillWave /> Refund Policy Guidelines
        </h1>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8">
        
        <div className="p-4 bg-orange-50 border border-brand-orange/20 rounded-xl text-sm font-semibold text-gray-700">
          We want you to be fully satisfied with your CatchWatch premium experience. Please read our matrix guidelines carefully before subscribing.
        </div>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaUndoAlt /></span> 7-Day Money-Back Guarantee
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            For newly registered premium users on annual or monthly plans, we offer a 7-day money-back guarantee. If you are unsatisfied within the first 7 days of your initial purchase, you are eligible for a full refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaUndoAlt /></span> Non-Refundable Scenarios
          </h2>
          <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2">
            <li>Test Plans (₹1 subscriptions) are strictly non-refundable.</li>
            <li>Subscription renewals that have already been billed for the current cycle.</li>
            <li>Accounts terminated due to violation of our Terms & Conditions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaUndoAlt /></span> How to Request a Refund
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Please navigate to the Help & Support Desk and submit a billing ticket. Refunds are typically processed within 5-7 business days to your original payment method.
          </p>
        </section>
      </div>
    </div>
  );
};

export default RefundPolicyPage;