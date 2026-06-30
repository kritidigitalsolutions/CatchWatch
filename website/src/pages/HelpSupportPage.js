import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeadset, FaEnvelope, FaPhoneAlt } from 'react-icons/fa';

const HelpSupportPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-2 sm:px-0">
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
          <FaHeadset /> Help & Support Desk
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info Block */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-extrabold text-gray-900">Get in Touch</h2>
          <p className="text-sm text-gray-500 font-medium">
            Having trouble with video playback, billing, or your profile? Reach out to our technical team.
          </p>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-10 h-10 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-lg">
                <FaEnvelope />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Email Support</p>
                <p className="text-sm font-bold text-gray-800">support@catchwatch.com</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-10 h-10 bg-brand-light-bg text-brand-orange rounded-full flex items-center justify-center text-lg">
                <FaPhoneAlt />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Helpline (Mon-Fri)</p>
                <p className="text-sm font-bold text-gray-800">+91 1800-123-CATCH</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Submission Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">Submit a Ticket</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Support ticket submitted!"); }}>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Issue Category</label>
              <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:border-brand-orange">
                <option>Playback / Streaming Issue</option>
                <option>Billing / Payment Refund</option>
                <option>Account & Login Problem</option>
                <option>Other Enquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Describe the Issue</label>
              <textarea 
                rows="4" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm focus:outline-none focus:border-brand-orange resize-none"
                placeholder="Explain the problem you are facing..."
                required
              />
            </div>

            <button type="submit" className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3.5 rounded-xl shadow-md transition transform active:scale-[0.99]">
              Send Message
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default HelpSupportPage;