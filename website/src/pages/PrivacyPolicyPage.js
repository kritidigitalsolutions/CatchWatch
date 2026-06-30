import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaShieldAlt, FaLock } from 'react-icons/fa';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-2 sm:px-0">
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
          <FaShieldAlt /> Privacy Regulation Matrix
        </h1>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8">
        
        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaLock /></span> 1. Data Collection
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            CatchWatch collects specific data blocks to enhance your streaming experience. This includes account metadata (name, email), playback metrics (what you watch and for how long), and device network structures.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaLock /></span> 2. Usage of Information
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your data feeds our recommendation algorithms to provide you with tailored "Recommended Content" and "Trending Now" lists. We also use it to process premium billing via secure gateways.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-brand-orange"><FaLock /></span> 3. Third-Party Sharing
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We do not sell your personal data. We only share necessary encrypted payloads with verified payment processors and cloud hosting pipelines required to operate the CatchWatch network.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;