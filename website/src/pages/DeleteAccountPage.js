import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaExclamationTriangle, FaTrashAlt, FaShieldAlt, FaCheckCircle, FaLock } from 'react-icons/fa';

const DeleteAccountPage = () => {
  const navigate = useNavigate();

  // Form State
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-defined reason options
  const reasonOptions = [
    { id: 'not_using', label: 'I am no longer using CatchWatch' },
    { id: 'privacy', label: 'Privacy or security concerns' },
    { id: 'subscription', label: 'Switched to a different streaming service' },
    { id: 'technical', label: 'Technical issues or frequent bugs' },
    { id: 'too_much_cost', label: 'Subscription cost is too high' },
    { id: 'other', label: 'Other (Please specify below)' }
  ];

  // Static Form Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!reason) {
      setErrorMessage('Please select a reason for deleting your account.');
      return;
    }

    if (reason === 'other' && !customReason.trim()) {
      setErrorMessage('Please state your reason in the text box below.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('You must acknowledge that this action is permanent.');
      return;
    }

    if (confirmText.toLowerCase() !== 'delete') {
      setErrorMessage('Please type "DELETE" to confirm your deletion request.');
      return;
    }

    // Simulate request submission
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto w-full py-8 px-4 sm:px-6 lg:px-8 min-h-[85vh] flex flex-col justify-center">
      
      {/* Back Navigation Bar */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-brand-orange transition-colors cursor-pointer group"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Profile</span>
        </button>
      </div>

      {isSubmitted ? (
        /* Success / Confirmation State Modal Card */
        <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center animate-fadeIn">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-4xl">
            <FaCheckCircle />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Account Deletion Request Submitted
          </h2>
          <p className="text-gray-600 max-w-md mx-auto text-sm sm:text-base mb-6 leading-relaxed">
            Your request to delete your account has been recorded. All associated watch histories, profiles, and active subscription details have been scheduled for permanent erasure.
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs sm:text-sm font-medium mb-8 max-w-lg mx-auto flex items-start gap-3 text-left">
            <FaExclamationTriangle className="text-amber-600 text-lg flex-shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> A 30-day grace period is activated. If you log back into your CatchWatch account within 30 days, your deletion request will automatically be cancelled.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-xl shadow-md transition transform active:scale-95"
            >
              Return to Login
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-8 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      ) : (
        /* Main Deletion Form Container */
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-xl">
                <FaTrashAlt />
              </span>
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Danger Zone
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Delete CatchWatch Account
            </h1>
            <p className="text-red-100 text-xs sm:text-sm mt-1 max-w-xl">
              We are sorry to see you go. Please review the implications below before proceeding with account deletion.
            </p>
          </div>

          {/* Critical Warning Callout */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl text-xl flex-shrink-0 mt-0.5">
                <FaExclamationTriangle />
              </div>
              <div className="text-xs sm:text-sm text-red-900 space-y-2">
                <h3 className="font-bold text-red-900 text-base">What happens when you delete your account?</h3>
                <ul className="list-disc list-inside space-y-1 text-red-800/90 leading-relaxed">
                  <li>Your personal profile details (Name, Email, Mobile number) will be purged.</li>
                  <li>Your entire <strong>Watch History</strong>, <strong>Saved Wishlists</strong>, and custom preferences will be erased.</li>
                  <li>Active premium subscriptions will be cancelled immediately without refund eligibility.</li>
                  <li>You will be logged out on all active mobile and desktop devices.</li>
                </ul>
              </div>
            </div>

            {/* Error Feedback Display */}
            {errorMessage && (
              <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl text-xs sm:text-sm font-semibold text-center animate-shake">
                {errorMessage}
              </div>
            )}

            {/* Account Deletion Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Step 1: Reason Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  1. Why are you deleting your account? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reasonOptions.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center p-3.5 border rounded-2xl cursor-pointer transition-all ${
                        reason === item.id
                          ? 'border-red-500 bg-red-50/50 text-red-900 font-semibold shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deletion_reason"
                        value={item.id}
                        checked={reason === item.id}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                      <span className="ml-3 text-xs sm:text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Reason Text Box (Optional or Required if 'other') */}
              {reason === 'other' && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Specify Your Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tell us more about why you'd like to remove your account..."
                    className="w-full p-3.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              )}

              {/* Step 2: Security & Confirmation Checkbox */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <label className="block text-sm font-bold text-gray-800">
                  2. Security & Final Acknowledgement <span className="text-red-500">*</span>
                </label>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium leading-normal">
                      I understand and agree that deleting my CatchWatch account is <strong>permanent</strong> and cannot be reverted after the grace period.
                    </span>
                  </label>
                </div>

                {/* Step 3: Type DELETE Confirmation */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5 tracking-wider">
                    To confirm, type <span className="text-red-600 font-extrabold select-all">DELETE</span> in the box below:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full p-3.5 border border-gray-300 rounded-xl text-sm font-bold tracking-wider text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase"
                    />
                    <div className="absolute right-3.5 top-3.5 text-gray-400">
                      <FaLock />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Container */}
              <div className="pt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-full sm:w-auto px-6 py-3.5 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition text-sm text-center"
                >
                  Cancel & Keep Account
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl shadow-lg hover:shadow-red-500/20 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing Deletion...</span>
                    </>
                  ) : (
                    <>
                      <FaShieldAlt />
                      <span>Permanently Delete My Account</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountPage;
