import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeadset, FaEnvelope, FaPhoneAlt, FaQuestionCircle } from 'react-icons/fa';

import { getHelpCategories, createSupportTicket } from '../api/supportApi';

const HelpSupportPage = () => {
  const navigate = useNavigate();

  // Form and Data States
  const [categories] = useState([
    "Playback / Streaming Issue", 
    "Billing / Payment Refund", 
    "Account & Login Problem", 
    "Other Enquiry"
  ]);
  const [selectedCategory, setSelectedCategory] = useState("Playback / Streaming Issue");
  const [description, setDescription] = useState('');
  
  // Dynamic Contact & FAQ States from API
  const [contactData, setContactData] = useState({
    email: 'support@catchwatch.com', // Fallbacks
    emailDesc: 'Response within 24 hours',
    phone: '+91 1800-123-CATCH',
    phoneDesc: 'Mon–Sat, 10 AM – 7 PM IST'
  });
  const [faqs, setFaqs] = useState([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch Help Data on Mount
  useEffect(() => {
    const fetchHelpData = async () => {
      setIsLoading(true);
      try {
        const response = await getHelpCategories();
        const helpDataArray = response?.helpData || [];

        if (helpDataArray.length > 0) {
          // Extract Email Info
          const emailInfo = helpDataArray.find(item => item.question === "Support Email");
          // Extract Phone Info
          const phoneInfo = helpDataArray.find(item => item.question === "Support Phone");
          // Extract FAQs
          const faqItems = helpDataArray.filter(item => item.category === "faq");

          setContactData({
            email: emailInfo?.answer || 'support@catchwatch.com',
            emailDesc: emailInfo?.supportNumber || 'Response within 24 hours',
            phone: phoneInfo?.supportNumber || '+91 1800-123-CATCH',
            phoneDesc: phoneInfo?.answer || 'Mon–Sat, 10 AM – 7 PM IST'
          });

          if (faqItems.length > 0) {
            setFaqs(faqItems);
          }
        }
      } catch (error) {
        console.error("Error fetching help data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHelpData();
  }, []);

  // Handle Ticket Submission
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    // 401 FIX: Check if user is logged in before making the API call
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
      setFeedback({ type: 'error', message: 'You must be logged in to submit a support ticket.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const getCategoryEnum = (cat) => {
        if (cat === "Playback / Streaming Issue") return "TECHNICAL";
        if (cat === "Billing / Payment Refund") return "BILLING";
        if (cat === "Account & Login Problem") return "ACCOUNT";
        return "OTHER";
      };

      const payload = {
        subject: selectedCategory,
        message: description,
        category: getCategoryEnum(selectedCategory),
      };

      await createSupportTicket(payload);
      
      setFeedback({ type: 'success', message: 'Support ticket submitted successfully! Our team will reach out soon.' });
      setDescription(''); 
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      
      // Handle 401 specifically in the UI
      if (error.response && error.response.status === 401) {
        setFeedback({ type: 'error', message: 'Session expired. Please log in again to submit a ticket.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to submit the ticket. Please try again later.' });
      }
    } finally {
      setIsSubmitting(false);
      
      setTimeout(() => {
        setFeedback({ type: '', message: '' });
      }, 6000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
          <FaHeadset /> Help & Support Desk
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Dynamic Contact Info & FAQs */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-extrabold text-gray-900">Get in Touch</h2>
            <p className="text-sm text-gray-500 font-medium">
              Having trouble with video playback, billing, or your profile? Reach out to our technical team through the channels below.
            </p>
            
            <div className="space-y-4 pt-4">
              {/* Dynamic Email */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition hover:border-brand-orange/30">
                <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  <FaEnvelope />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Email Support</p>
                  <p className="text-sm font-bold text-gray-800">{isLoading ? "Loading..." : contactData.email}</p>
                  <p className="text-[10px] font-semibold text-brand-orange mt-0.5">{contactData.emailDesc}</p>
                </div>
              </div>
              
              {/* Dynamic Phone */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition hover:border-brand-orange/30">
                <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  <FaPhoneAlt />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Helpline Number</p>
                  <p className="text-sm font-bold text-gray-800">{isLoading ? "Loading..." : contactData.phone}</p>
                  <p className="text-[10px] font-semibold text-brand-orange mt-0.5">{contactData.phoneDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic FAQs Box (Shows if FAQ data exists) */}
          {faqs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <FaQuestionCircle className="text-brand-orange" /> Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq._id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-bold text-gray-800 mb-1">{faq.question}</p>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Ticket Submission Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 h-fit">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">Submit a Ticket</h2>
          
          <form className="space-y-5" onSubmit={handleTicketSubmit}>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issue Category</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
              >
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Describe the Issue</label>
              <textarea 
                rows="5" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange resize-none"
                placeholder="Please explain the problem you are facing in detail..."
                required
              />
            </div>

            {/* Feedback Message */}
            {feedback.message && (
              <div className={`p-4 rounded-xl text-xs font-bold leading-relaxed ${
                feedback.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {feedback.message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting || !description.trim()}
              className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-md transition transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                "Submit Support Ticket"
              )}
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
};

export default HelpSupportPage;