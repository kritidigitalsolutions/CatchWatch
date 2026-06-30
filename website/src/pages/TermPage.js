import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileContract, FaRegCheckCircle } from 'react-icons/fa';

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-2 sm:px-0">
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
          <FaFileContract /> Terms & Conditions
        </h1>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8">
        <p className="text-sm text-gray-500 font-medium">Last updated: June 30, 2026</p>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaRegCheckCircle /></span> 1. Acceptance of Terms
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            By accessing and using the CatchWatch streaming service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaRegCheckCircle /></span> 2. User Accounts & Subscriptions
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed space-y-2">
            <span className="block">To access premium cinematic content, you must create an account and subscribe to a valid membership plan.</span>
            <span className="block">You are responsible for maintaining the confidentiality of your account and password and for restricting access to your devices.</span>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaRegCheckCircle /></span> 3. Content Usage & Copyright
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            All movies, TV shows, and shorts available on CatchWatch are protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of any content without explicit authorization.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;