import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileContract } from 'react-icons/fa';
import Loader from '../components/Loader';
import { getLegalDocByType, getLegalDocs } from '../api/legalApi';

const LegalPage = () => {
  // URL se dynamic 'type' extract karein (e.g., 'terms', 'privacy-policy')
  const { type } = useParams(); 
  const navigate = useNavigate();

  const [legalData, setLegalData] = useState(null);
  const [allLegalDocs, setAllLegalDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLegalData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // API call with dynamic type
        const response = await getLegalDocByType(type); 
        const data = response?.document || response?.data || response;
        
        if (data && (data.sections?.length > 0 || data.content || data.text)) {
          setLegalData(data);
        } else {
          setError(`Document for ${type} is empty or not formatted correctly.`);
        }
      } catch (err) {
        console.error(`API Error fetching ${type}:`, err);
        setError(`The document for ${(type || '').replace('-', ' ')} is currently unavailable.`);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAllDocs = async () => {
      try {
        const res = await getLegalDocs();
        if (res?.documents) {
          setAllLegalDocs(res.documents);
        }
      } catch (err) {
        console.error("Fetch all legal docs error:", err);
      }
    };

    if (type) {
      fetchLegalData();
      fetchAllDocs();
    }
  }, [type]);

  // Dynamic Title generation for fallback
  const getPageTitle = () => {
    if (legalData?.title) return legalData.title;
    if (type === 'terms' || type === 'terms-conditions') return 'Terms & Conditions';
    if (type === 'privacy-policy') return 'Privacy Policy';
    if (type === 'refund-policy') return 'Refund Policy';
    return (type || 'Legal Document').replace('-', ' ');
  };

  const formatContentToHtml = (content) => {
    if (!content) return "";
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    
    return content
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = block;
        if (!trimmed.trim()) return "";
        
        if (trimmed.startsWith("### ")) {
          return `<h3 class="text-base sm:text-lg font-bold text-gray-900 mt-4 mb-2">${trimmed.replace(/^###\s*/, "")}</h3>`;
        }
        if (trimmed.startsWith("## ")) {
          return `<h2 class="text-lg sm:text-xl font-black text-gray-955 mt-6 mb-3 border-b border-gray-100 pb-1">${trimmed.replace(/^##\s*/, "")}</h2>`;
        }
        if (trimmed.startsWith("# ")) {
          return `<h1 class="text-xl sm:text-2xl font-black text-gray-955 mt-8 mb-4">${trimmed.replace(/^#\s*/, "")}</h1>`;
        }
        
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return `<h2 class="text-lg sm:text-xl font-black text-gray-955 mt-6 mb-3 border-b border-gray-100 pb-1">${trimmed.replace(/\*\*/g, "")}</h2>`;
        }
        
        return `<p class="mb-4 text-gray-700 leading-relaxed font-medium text-justify whitespace-pre-wrap">${trimmed}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  };

  const formattedDate = legalData?.updatedAt 
    ? new Date(legalData.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US');

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="text-center p-20 text-gray-800 flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold capitalize">{(type || '').replace('-', ' ')}</h2>
        <p className="text-gray-500">{error}</p>
        <button onClick={() => navigate(-1)} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const otherPages = allLegalDocs.filter((doc) => doc.type !== type && doc.type !== legalData?.type);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-2 sm:px-0 py-6">
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2 capitalize">
          <FaFileContract /> {getPageTitle()}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8">
        <p className="text-sm text-gray-500 font-medium">Last updated: {formattedDate}</p>

        {legalData?.sections && legalData.sections.length > 0 ? (
          <div className="space-y-6">
            {legalData.sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-3">
                {section.heading && (
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 border-b border-gray-100 pb-2">
                    {section.heading}
                  </h2>
                )}
                {(section.paragraphs || []).map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-gray-700 leading-relaxed font-medium text-justify whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : legalData?.content ? (
          <div 
            className="prose prose-sm sm:prose-base max-w-none text-gray-600 prose-headings:text-gray-900 prose-a:text-brand-orange whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formatContentToHtml(legalData.content) }}
          />
        ) : (
          <div className="text-gray-600 text-sm">
            Content mapping failed. Check backend JSON structure.
          </div>
        )}
      </div>

      {/* ── VIEW OTHER PAGES OPTION ── */}
      {otherPages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
            <FaFileContract className="text-brand-orange" /> View Other Legal & Policy Pages ({otherPages.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherPages.map((doc) => (
              <button
                key={doc._id || doc.type}
                onClick={() => navigate(`/${doc.type}`)}
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-orange-50/80 border border-gray-100 hover:border-brand-orange/40 rounded-xl transition text-left group"
              >
                <span className="text-xs font-extrabold text-gray-800 group-hover:text-brand-orange truncate">
                  {doc.title}
                </span>
                <span className="text-xs font-black text-brand-orange ml-2">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalPage;